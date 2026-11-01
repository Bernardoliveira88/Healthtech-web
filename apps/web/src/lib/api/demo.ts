/**
 * Modo demonstração (NEXT_PUBLIC_DEMO_MODE=true).
 *
 * Substitui a API real por um backend em memória com dados fictícios, para
 * que a interface possa ser publicada sem PostgreSQL, Redis e worker de IA.
 * Os dados vivem só na aba do navegador e voltam ao estado inicial ao recarregar.
 */
import type {
  Admission,
  ClinicalAlert,
  Conduct,
  DashboardBed,
  FamilyContact,
  FamilyMessage,
  FamilyUpdate,
  NearMiss,
  Patient,
  Pending,
  Prescription,
  ShiftHandoff,
  ShiftType,
  User,
  Visit,
  VisitStructuredData,
} from "@/lib/types";

export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const HOSPITAL_ID = "demo-hospital";

const HOUR = 60 * 60 * 1000;
const ago = (hours: number) => new Date(Date.now() - hours * HOUR).toISOString();
const ahead = (hours: number) => new Date(Date.now() + hours * HOUR).toISOString();

let seq = 1000;
const newId = (prefix: string) => `${prefix}-${++seq}`;

/** Erro com o mesmo formato do ApiError, sem importar client.ts (evita ciclo). */
export class DemoApiError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`API Error ${status}: ${body}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

// ---------------------------------------------------------------------------
// Usuários de demonstração (um por papel)
// ---------------------------------------------------------------------------

export const DEMO_USERS: Array<User & { label: string; description: string }> = [
  {
    id: "u-physician",
    name: "Dr. João Mendes",
    email: "joao@roundlog.dev",
    role: "PHYSICIAN",
    hospitalId: HOSPITAL_ID,
    crm: "CRM-BA 00000",
    label: "Médico",
    description: "Visitas, condutas e internações",
  },
  {
    id: "u-nurse",
    name: "Enf. Ana Souza",
    email: "ana@roundlog.dev",
    role: "NURSE",
    hospitalId: HOSPITAL_ID,
    coren: "COREN-BA 00000",
    label: "Enfermagem",
    description: "Dashboard da ala e passagem de plantão",
  },
  {
    id: "u-manager",
    name: "Carla Lima",
    email: "carla@roundlog.dev",
    role: "MANAGER",
    hospitalId: HOSPITAL_ID,
    label: "Gestão",
    description: "Ocupação, indicadores e near-misses",
  },
];

// ---------------------------------------------------------------------------
// Dados iniciais
// ---------------------------------------------------------------------------

type DemoBed = { id: string; wardId: string; code: string; status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" };
type DemoWard = { id: string; hospitalId: string; name: string; floor: string | null; specialty: string | null };
type DemoShift = { id: string; wardId: string; nurseId: string; type: ShiftType; startedAt: string; endedAt: string | null; nurse?: { id: string; name: string } };
type DemoNotification = { id: string; userId: string; type: string; title: string; body: string; url: string | null; readAt: string | null; createdAt: string };

const wards: DemoWard[] = [
  { id: "w-clinica", hospitalId: HOSPITAL_ID, name: "Clínica Médica", floor: "3º andar", specialty: "Clínica geral" },
  { id: "w-uti", hospitalId: HOSPITAL_ID, name: "UTI Adulto", floor: "4º andar", specialty: "Terapia intensiva" },
];

const beds: DemoBed[] = [
  ...["301", "302", "303", "304", "305", "306"].map((code) => ({
    id: `b-${code}`, wardId: "w-clinica", code, status: "AVAILABLE" as const,
  })),
  ...["UTI-01", "UTI-02", "UTI-03", "UTI-04"].map((code) => ({
    id: `b-${code}`, wardId: "w-uti", code, status: "AVAILABLE" as const,
  })),
];
beds.find((b) => b.code === "306")!.status = "MAINTENANCE";

const patients: Patient[] = [
  { id: "p-1", hospitalId: HOSPITAL_ID, name: "Maria das Graças Silva", cpf: "000.000.001-01", dob: "1951-03-12", bloodType: "O+", allergies: ["Dipirona"], createdAt: ago(80) },
  { id: "p-2", hospitalId: HOSPITAL_ID, name: "José Carlos Pereira", cpf: "000.000.002-02", dob: "1964-08-30", bloodType: "A+", allergies: [], createdAt: ago(60) },
  { id: "p-3", hospitalId: HOSPITAL_ID, name: "Antônia Ribeiro Santos", cpf: "000.000.003-03", dob: "1978-11-02", bloodType: "B-", allergies: ["Penicilina"], createdAt: ago(50) },
  { id: "p-4", hospitalId: HOSPITAL_ID, name: "Francisco Alves Costa", cpf: "000.000.004-04", dob: "1945-01-19", bloodType: "AB+", allergies: [], createdAt: ago(30) },
  { id: "p-5", hospitalId: HOSPITAL_ID, name: "Luiza Fernandes Rocha", cpf: "000.000.005-05", dob: "1989-06-25", bloodType: "O-", allergies: ["Látex", "Iodo"], createdAt: ago(20) },
  { id: "p-6", hospitalId: HOSPITAL_ID, name: "Pedro Henrique Nunes", cpf: "000.000.006-06", dob: "1970-04-08", bloodType: "A-", allergies: [], createdAt: ago(400) },
];

type DemoAdmission = Admission & { familyContacts: FamilyContact[] };

const admissions: DemoAdmission[] = [];
const visits: Visit[] = [];

function admit(id: string, patientId: string, bedCode: string, diagnosis: string, hoursAgo: number) {
  const bed = beds.find((b) => b.code === bedCode)!;
  bed.status = "OCCUPIED";
  admissions.push({
    id, patientId, bedId: bed.id, admittedById: "u-physician", admittedAt: ago(hoursAgo),
    dischargedAt: null, diagnosis, status: "ACTIVE", familyContacts: [],
  });
}

admit("a-1", "p-1", "301", "Pneumonia adquirida na comunidade", 72);
admit("a-2", "p-2", "302", "Insuficiência cardíaca descompensada", 48);
admit("a-3", "p-3", "304", "Pielonefrite aguda", 30);
admit("a-4", "p-4", "UTI-01", "Sepse de foco pulmonar", 26);
admit("a-5", "p-5", "UTI-03", "Cetoacidose diabética", 14);
admissions.push({
  id: "a-6", patientId: "p-6", bedId: "b-305", admittedById: "u-physician", admittedAt: ago(400),
  dischargedAt: ago(300), diagnosis: "Celulite em membro inferior", status: "DISCHARGED", familyContacts: [],
});
admissions[0].familyContacts.push({
  id: "fc-1", admissionId: "a-1", name: "Cláudia Silva", relationship: "Filha", phone: "(75) 90000-0001",
  accessToken: "demo-family-token-maria-0001",
});

function conduct(visitId: string, description: string, priority: Conduct["priority"], deadlineHours: number | null, status: Conduct["status"] = "OPEN"): Conduct {
  return {
    id: newId("c"), visitId, description, priority,
    deadlineAt: deadlineHours == null ? null : ahead(deadlineHours), status,
    resolvedById: status === "RESOLVED" ? "u-nurse" : null,
    resolvedAt: status === "RESOLVED" ? ago(2) : null,
  };
}

function pending(visitId: string, description: string, assignedToRole: string): Pending {
  return { id: newId("pd"), visitId, description, assignedToRole, status: "OPEN", resolvedById: null, resolvedAt: null };
}

function alert(visitId: string, type: string, severity: string, description: string): ClinicalAlert {
  return { id: newId("al"), visitId, type, severity, description, acknowledgedById: null, acknowledgedAt: null };
}

function prescription(visitId: string, medication: string, dose: string, route: string, frequency: string, duration: string): Prescription {
  return { id: newId("rx"), visitId, medication, dose, route, frequency, duration, notes: null };
}

function structured(v: Visit, transcript: string): VisitStructuredData {
  return {
    transcript,
    conducts: v.conducts.map((c) => ({
      description: c.description, priority: c.priority,
      deadline_hours: c.deadlineAt ? Math.max(1, Math.round((Date.parse(c.deadlineAt) - Date.now()) / HOUR)) : null,
    })),
    pendings: v.pendings.map((p) => ({ description: p.description, assigned_to: p.assignedToRole ?? "" })),
    alerts: v.alerts.map((a) => ({ type: a.type, severity: a.severity, description: a.description })),
    prescriptions: v.prescriptions.map((p) => ({
      medication: p.medication, dose: p.dose, route: p.route, frequency: p.frequency, duration: p.duration ?? "",
    })),
  };
}

function addVisit(admissionId: string, hoursAgo: number, build: (id: string) => Omit<Visit, "id" | "admissionId" | "physicianId" | "status" | "startedAt" | "finishedAt" | "structuredJson" | "transcriptRaw">, transcript: string) {
  const id = newId("v");
  const parts = build(id);
  const v: Visit = {
    id, admissionId, physicianId: "u-physician", status: "READY",
    startedAt: ago(hoursAgo), finishedAt: ago(hoursAgo - 0.2), audioUrl: null,
    transcriptRaw: transcript, structuredJson: null, ...parts,
  };
  v.structuredJson = structured(v, transcript);
  visits.push(v);
}

addVisit("a-1", 5, (id) => ({
  conducts: [
    conduct(id, "Coletar hemoculturas antes da próxima dose de antibiótico", "HIGH", -1),
    conduct(id, "Manter oxigênio por cateter nasal a 2 L/min, alvo SpO2 ≥ 92%", "MEDIUM", 6),
    conduct(id, "Fisioterapia respiratória duas vezes ao dia", "LOW", 24, "RESOLVED"),
  ],
  pendings: [pending(id, "Resultado da radiografia de tórax de controle", "LAB")],
  alerts: [alert(id, "allergy", "critical", "Paciente alérgica a dipirona: usar paracetamol para febre")],
  prescriptions: [
    prescription(id, "Ceftriaxona", "1 g", "EV", "12/12h", "7 dias"),
    prescription(id, "Azitromicina", "500 mg", "VO", "1x ao dia", "5 dias"),
  ],
}), "Paciente no terceiro dia de internação por pneumonia, afebril nas últimas 12 horas, saturando 93% com 2 litros de oxigênio. Manter ceftriaxona e azitromicina, colher hemoculturas, seguir com fisioterapia respiratória. Lembrar alergia a dipirona.");

addVisit("a-2", 4, (id) => ({
  conducts: [
    conduct(id, "Balanço hídrico rigoroso e peso diário em jejum", "HIGH", 2),
    conduct(id, "Restrição hídrica de 1,2 L/dia", "MEDIUM", 12),
  ],
  pendings: [pending(id, "Ecocardiograma transtorácico", "IMAGING")],
  alerts: [alert(id, "critical_value", "warning", "Potássio 5,6 mEq/L no exame da manhã")],
  prescriptions: [
    prescription(id, "Furosemida", "40 mg", "EV", "12/12h", "Reavaliar em 48h"),
    prescription(id, "Carvedilol", "6,25 mg", "VO", "12/12h", "Uso contínuo"),
  ],
}), "Paciente com insuficiência cardíaca, edema de membros inferiores melhorando. Potássio 5,6, suspender suplementação. Manter furosemida endovenosa, balanço hídrico rigoroso e solicitar ecocardiograma.");

addVisit("a-3", 3, (id) => ({
  conducts: [conduct(id, "Hidratação venosa com soro fisiológico 1.500 mL/24h", "MEDIUM", 8)],
  pendings: [pending(id, "Urocultura com antibiograma", "LAB")],
  alerts: [alert(id, "allergy", "critical", "Alergia a penicilina registrada")],
  prescriptions: [prescription(id, "Ciprofloxacino", "400 mg", "EV", "12/12h", "10 dias")],
}), "Paciente com pielonefrite, melhora da dor lombar, ainda com febre baixa. Alergia a penicilina. Manter ciprofloxacino e hidratação, aguardar urocultura.");

addVisit("a-4", 2, (id) => ({
  conducts: [
    conduct(id, "Reavaliar lactato em 2 horas", "CRITICAL", -0.5),
    conduct(id, "Mudança de decúbito a cada 2 horas", "MEDIUM", 2),
  ],
  pendings: [pending(id, "Vaga para hemodiálise se diurese < 0,5 mL/kg/h", "NURSE")],
  alerts: [alert(id, "fall_risk", "warning", "Risco alto de queda (escala de Morse 55)")],
  prescriptions: [
    prescription(id, "Meropenem", "1 g", "EV", "8/8h", "7 dias"),
    prescription(id, "Noradrenalina", "0,1 mcg/kg/min", "EV contínua", "Titular pela PAM", "Conforme resposta"),
  ],
}), "Paciente séptico em uso de noradrenalina em dose baixa, lactato em queda. Manter meropenem, reavaliar lactato em duas horas e acompanhar diurese.");

addVisit("a-5", 1, (id) => ({
  conducts: [conduct(id, "Glicemia capilar de 1 em 1 hora durante insulina contínua", "HIGH", 1)],
  pendings: [pending(id, "Gasometria arterial de controle", "LAB")],
  alerts: [],
  prescriptions: [prescription(id, "Insulina regular", "0,1 UI/kg/h", "EV contínua", "Contínua", "Até resolução da acidose")],
}), "Paciente com cetoacidose diabética, em insulina contínua. Glicemia horária, repetir gasometria e repor potássio conforme protocolo.");

const shifts: DemoShift[] = [
  { id: "s-1", wardId: "w-clinica", nurseId: "u-nurse", type: "MORNING", startedAt: ago(5), endedAt: null, nurse: { id: "u-nurse", name: "Enf. Ana Souza" } },
  { id: "s-2", wardId: "w-uti", nurseId: "u-nurse", type: "MORNING", startedAt: ago(5), endedAt: null, nurse: { id: "u-nurse", name: "Enf. Ana Souza" } },
];

const handoffs: ShiftHandoff[] = [];

const nearMisses: NearMiss[] = [
  { id: "nm-1", hospitalId: HOSPITAL_ID, wardId: "w-clinica", reportedAt: ago(30), category: "medication", severity: "near_miss", description: "Prescrição de dipirona para paciente alérgica identificada antes da administração.", isAnonymous: true },
  { id: "nm-2", hospitalId: HOSPITAL_ID, wardId: "w-uti", reportedAt: ago(70), category: "equipment", severity: "no_harm", description: "Bomba de infusão com alarme desativado encontrada na troca de turno.", isAnonymous: false },
  { id: "nm-3", hospitalId: HOSPITAL_ID, wardId: "w-clinica", reportedAt: ago(120), category: "fall", severity: "no_harm", description: "Paciente levantou sem auxílio; grade da cama estava abaixada.", isAnonymous: true },
  { id: "nm-4", hospitalId: HOSPITAL_ID, wardId: "w-uti", reportedAt: ago(200), category: "communication", severity: "near_miss", description: "Exame solicitado verbalmente não constava no sistema na passagem de plantão.", isAnonymous: false },
];

const notifications: DemoNotification[] = [
  { id: "n-1", userId: "*", type: "alert", title: "Alerta clínico", body: "Potássio 5,6 mEq/L — José Carlos Pereira (leito 302)", url: null, readAt: null, createdAt: ago(3) },
  { id: "n-2", userId: "*", type: "conduct", title: "Conduta atrasada", body: "Reavaliar lactato — Francisco Alves Costa (UTI-01)", url: null, readAt: null, createdAt: ago(1) },
  { id: "n-3", userId: "*", type: "info", title: "Bem-vindo à demonstração", body: "Todos os dados são fictícios e ficam apenas neste navegador.", url: null, readAt: ago(0.5), createdAt: ago(6) },
];

const familyUpdates: FamilyUpdate[] = [
  { id: "fu-1", admissionId: "a-1", visitId: null, contentLay: "Dona Maria passou a noite sem febre e está respirando melhor. Ela continua recebendo antibiótico na veia e um pouco de oxigênio.", generatedAt: ago(4), readAt: null },
];
const familyMessages: FamilyMessage[] = [];

// ---------------------------------------------------------------------------
// Helpers de leitura
// ---------------------------------------------------------------------------

const bedOf = (id: string) => beds.find((b) => b.id === id)!;
const wardOf = (id: string) => wards.find((w) => w.id === id)!;
const patientOf = (id: string) => patients.find((p) => p.id === id)!;
const allConducts = () => visits.flatMap((v) => v.conducts);

function bedWithWard(bedId: string) {
  const bed = bedOf(bedId);
  const ward = wardOf(bed.wardId);
  return { id: bed.id, code: bed.code, ward: { id: ward.id, name: ward.name } };
}

function plainAdmission(a: DemoAdmission) {
  const { familyContacts: _contacts, ...rest } = a;
  void _contacts;
  return rest;
}

function dashboard(wardId: string): DashboardBed[] {
  return beds
    .filter((b) => b.wardId === wardId)
    .map((b) => ({
      ...b,
      admissions: admissions
        .filter((a) => a.bedId === b.id && a.status === "ACTIVE")
        .map((a) => {
          return {
            ...plainAdmission(a),
            patient: patientOf(a.patientId),
            visits: visits
              .filter((v) => v.admissionId === a.id)
              .sort((x, y) => y.startedAt.localeCompare(x.startedAt))
              .slice(0, 1)
              .map((v) => ({
                id: v.id, status: v.status, startedAt: v.startedAt,
                conducts: v.conducts.filter((c) => c.status !== "RESOLVED"),
                pendings: v.pendings.filter((p) => p.status !== "RESOLVED") as unknown as Conduct[],
                alerts: v.alerts.filter((al) => !al.acknowledgedAt),
              })),
          };
        }),
    }));
}

function visitView(v: Visit): Visit {
  // Simula o worker de IA: depois de alguns segundos o áudio "processado" vira dados estruturados.
  if (v.status === "PROCESSING" && v.finishedAt && Date.now() - Date.parse(v.finishedAt) > 4000) {
    v.status = "READY";
    v.conducts = [
      conduct(v.id, "Reavaliar sinais vitais em 4 horas", "MEDIUM", 4),
      conduct(v.id, "Solicitar hemograma e PCR para amanhã cedo", "LOW", 18),
    ];
    v.pendings = [pending(v.id, "Parecer da nutrição", "NUTRITION")];
    v.alerts = [];
    v.prescriptions = [prescription(v.id, "Paracetamol", "750 mg", "VO", "6/6h se dor ou febre", "Se necessário")];
    v.transcriptRaw = "Visita registrada na demonstração. Paciente estável, sem queixas novas. Reavaliar sinais vitais em quatro horas, colher hemograma e PCR amanhã e pedir parecer da nutrição. Paracetamol se dor ou febre.";
    v.structuredJson = structured(v, v.transcriptRaw);
  }
  const a = admissions.find((x) => x.id === v.admissionId)!;
  const p = patientOf(a.patientId);
  return {
    ...v,
    admission: { ...plainAdmission(a), patient: p, bed: bedWithWard(a.bedId) } as unknown as Admission,
    physician: { id: "u-physician", name: "Dr. João Mendes", crm: "CRM-BA 00000" },
  };
}

function rate(part: number, total: number) {
  return total === 0 ? 0 : Math.round((part / total) * 1000) / 10;
}

function count<T>(items: T[], key: (item: T) => string, field: string) {
  const map = new Map<string, number>();
  items.forEach((i) => map.set(key(i), (map.get(key(i)) ?? 0) + 1));
  return Array.from(map, ([k, n]) => ({ [field]: k, _count: n }));
}

// ---------------------------------------------------------------------------
// Roteador
// ---------------------------------------------------------------------------

type Handler = (match: RegExpMatchArray, body: Record<string, unknown>, query: URLSearchParams) => unknown;

const routes: Array<[string, RegExp, Handler]> = [
  ["POST", /^\/auth\/login$/, (_m, body) => {
    const user = DEMO_USERS.find((u) => u.email === String(body.email ?? "").toLowerCase());
    if (!user) throw new DemoApiError(401, "Use um dos perfis de demonstração.");
    const { label: _l, description: _d, ...plain } = user;
    void _l; void _d;
    return { user: plain, token: `demo-token-${user.role.toLowerCase()}` };
  }],
  ["POST", /^\/auth\/register$/, () => {
    throw new DemoApiError(403, "Cadastro desativado na demonstração.");
  }],
  ["POST", /^\/auth\/(refresh|logout)$/, () => ({ token: "demo-token" })],

  ["GET", /^\/hospital$/, () => ({
    id: HOSPITAL_ID, name: "Hospital Escola (demonstração)", cnpj: "00.000.000/0001-00", createdAt: ago(2000),
    wards: wards.map(({ id, name, floor, specialty }) => ({ id, name, floor, specialty })),
  })],

  ["GET", /^\/wards$/, () => wards],
  ["POST", /^\/wards$/, (_m, body) => {
    const w: DemoWard = { id: newId("w"), hospitalId: HOSPITAL_ID, name: String(body.name), floor: (body.floor as string) ?? null, specialty: (body.specialty as string) ?? null };
    wards.push(w);
    return w;
  }],
  ["POST", /^\/wards\/([^/]+)\/beds$/, (m, body) => {
    const b: DemoBed = { id: newId("b"), wardId: m[1], code: String(body.code), status: (body.status as DemoBed["status"]) ?? "AVAILABLE" };
    beds.push(b);
    return b;
  }],
  ["GET", /^\/wards\/([^/]+)\/dashboard$/, (m) => dashboard(m[1])],
  ["GET", /^\/wards\/([^/]+)\/shifts$/, (m, _b, q) =>
    shifts.filter((s) => s.wardId === m[1] && (q.get("open") !== "true" || !s.endedAt))],

  ["POST", /^\/shifts$/, (_m, body) => {
    const s: DemoShift = { id: newId("s"), wardId: String(body.wardId), nurseId: "u-nurse", type: body.type as ShiftType, startedAt: new Date().toISOString(), endedAt: null, nurse: { id: "u-nurse", name: "Enf. Ana Souza" } };
    shifts.push(s);
    return s;
  }],
  ["PATCH", /^\/shifts\/([^/]+)\/close$/, (m) => {
    const s = shifts.find((x) => x.id === m[1]);
    if (!s) throw new DemoApiError(404, "Turno não encontrado");
    s.endedAt = new Date().toISOString();
    return s;
  }],

  ["GET", /^\/patients$/, (_m, _b, q) => {
    const search = (q.get("search") ?? "").toLowerCase();
    const items = patients
      .filter((p) => !search || p.name.toLowerCase().includes(search) || p.cpf.includes(search))
      .map((p) => ({
        ...p,
        admissions: admissions.filter((a) => a.patientId === p.id).map((a) => ({
          id: a.id, status: a.status, admittedAt: a.admittedAt, diagnosis: a.diagnosis ?? null,
          bed: { id: a.bedId, code: bedOf(a.bedId).code, wardId: bedOf(a.bedId).wardId },
        })),
      }));
    return { total: items.length, skip: 0, take: items.length, items };
  }],
  ["POST", /^\/patients$/, (_m, body) => {
    const p: Patient = {
      id: newId("p"), hospitalId: HOSPITAL_ID, name: String(body.name), cpf: String(body.cpf), dob: String(body.dob),
      bloodType: (body.bloodType as string) ?? null, allergies: (body.allergies as string[]) ?? [], createdAt: new Date().toISOString(),
    };
    patients.push(p);
    return p;
  }],
  ["GET", /^\/patients\/([^/]+)$/, (m) => {
    const p = patients.find((x) => x.id === m[1]);
    if (!p) throw new DemoApiError(404, "Paciente não encontrado");
    return {
      ...p,
      admissions: admissions.filter((a) => a.patientId === p.id).map((a) => ({ ...plainAdmission(a), bed: bedWithWard(a.bedId) })),
    };
  }],

  ["GET", /^\/admissions$/, (_m, _b, q) => {
    const items = admissions
      .filter((a) => !q.get("status") || a.status === q.get("status"))
      .filter((a) => !q.get("wardId") || bedOf(a.bedId).wardId === q.get("wardId"))
      .sort((x, y) => y.admittedAt.localeCompare(x.admittedAt))
      .map((a) => {
        const p = patientOf(a.patientId);
        return { ...plainAdmission(a), patient: { id: p.id, name: p.name, cpf: p.cpf }, bed: bedWithWard(a.bedId) };
      });
    return { total: items.length, skip: 0, take: items.length, items };
  }],
  ["POST", /^\/admissions$/, (_m, body) => {
    const bed = bedOf(String(body.bedId));
    if (!bed || bed.status !== "AVAILABLE") throw new DemoApiError(409, "Leito indisponível");
    bed.status = "OCCUPIED";
    const a: DemoAdmission = {
      id: newId("a"), patientId: String(body.patientId), bedId: bed.id, admittedById: "u-physician",
      admittedAt: new Date().toISOString(), dischargedAt: null, diagnosis: (body.diagnosis as string) ?? null,
      status: "ACTIVE", familyContacts: [],
    };
    admissions.push(a);
    return plainAdmission(a);
  }],
  ["GET", /^\/admissions\/([^/]+)$/, (m) => {
    const a = admissions.find((x) => x.id === m[1]);
    if (!a) throw new DemoApiError(404, "Internação não encontrada");
    return {
      ...a,
      patient: patientOf(a.patientId),
      bed: bedWithWard(a.bedId),
      visits: visits.filter((v) => v.admissionId === a.id)
        .sort((x, y) => y.startedAt.localeCompare(x.startedAt))
        .map((v) => ({ id: v.id, status: visitView(v).status, startedAt: v.startedAt, finishedAt: v.finishedAt ?? null })),
    };
  }],
  ["PATCH", /^\/admissions\/([^/]+)\/discharge$/, (m) => {
    const a = admissions.find((x) => x.id === m[1]);
    if (!a) throw new DemoApiError(404, "Internação não encontrada");
    a.status = "DISCHARGED";
    a.dischargedAt = new Date().toISOString();
    bedOf(a.bedId).status = "AVAILABLE";
    return plainAdmission(a);
  }],
  ["POST", /^\/admissions\/([^/]+)\/family-contacts$/, (m, body) => {
    const a = admissions.find((x) => x.id === m[1]);
    if (!a) throw new DemoApiError(404, "Internação não encontrada");
    const fc: FamilyContact = {
      id: newId("fc"), admissionId: a.id, name: String(body.name), relationship: String(body.relationship),
      phone: String(body.phone), accessToken: `demo-family-token-${Date.now()}`,
    };
    a.familyContacts.push(fc);
    return fc;
  }],

  ["POST", /^\/visits$/, (_m, body) => {
    const v: Visit = {
      id: newId("v"), admissionId: String(body.admissionId), physicianId: "u-physician", status: "RECORDING",
      startedAt: new Date().toISOString(), finishedAt: null, conducts: [], pendings: [], alerts: [], prescriptions: [],
    };
    visits.push(v);
    return v;
  }],
  ["POST", /^\/visits\/([^/]+)\/audio$/, (m) => {
    const v = visits.find((x) => x.id === m[1]);
    if (!v) throw new DemoApiError(404, "Visita não encontrada");
    v.status = "PROCESSING";
    v.finishedAt = new Date().toISOString();
    return { status: "PROCESSING" };
  }],
  ["GET", /^\/visits\/([^/]+)$/, (m) => {
    const v = visits.find((x) => x.id === m[1]);
    if (!v) throw new DemoApiError(404, "Visita não encontrada");
    return visitView(v);
  }],

  ["PATCH", /^\/conducts\/([^/]+)\/resolve$/, (m) => {
    const c = allConducts().find((x) => x.id === m[1]);
    if (!c) throw new DemoApiError(404, "Conduta não encontrada");
    Object.assign(c, { status: "RESOLVED", resolvedById: "demo", resolvedAt: new Date().toISOString() });
    return c;
  }],
  ["POST", /^\/conducts\/([^/]+)\/execute$/, (m, body) => {
    const c = allConducts().find((x) => x.id === m[1]);
    if (!c) throw new DemoApiError(404, "Conduta não encontrada");
    c.status = body.status === "done" ? "RESOLVED" : "IN_PROGRESS";
    if (c.status === "RESOLVED") c.resolvedAt = new Date().toISOString();
    return { id: newId("ex"), conductId: c.id, status: String(body.status) };
  }],
  ["PATCH", /^\/pendings\/([^/]+)\/resolve$/, (m) => {
    const p = visits.flatMap((v) => v.pendings).find((x) => x.id === m[1]);
    if (!p) throw new DemoApiError(404, "Pendência não encontrada");
    Object.assign(p, { status: "RESOLVED", resolvedById: "demo", resolvedAt: new Date().toISOString() });
    return p;
  }],
  ["PATCH", /^\/alerts\/([^/]+)\/acknowledge$/, (m) => {
    const a = visits.flatMap((v) => v.alerts).find((x) => x.id === m[1]);
    if (!a) throw new DemoApiError(404, "Alerta não encontrado");
    Object.assign(a, { acknowledgedById: "demo", acknowledgedAt: new Date().toISOString() });
    return a;
  }],

  ["GET", /^\/nursing\/overdue$/, () => visits.flatMap((v) => {
    const a = admissions.find((x) => x.id === v.admissionId)!;
    if (a.status !== "ACTIVE") return [];
    const p = patientOf(a.patientId);
    return v.conducts
      .filter((c) => c.status !== "RESOLVED" && c.deadlineAt && Date.parse(c.deadlineAt) < Date.now())
      .map((c) => ({ ...c, visit: { admission: { patient: { id: p.id, name: p.name }, bed: { id: a.bedId, code: bedOf(a.bedId).code } } } }));
  })],

  ["POST", /^\/handoffs\/generate$/, (_m, body) => {
    const wardId = String(body.wardId);
    const fromShift = shifts.find((s) => s.id === body.fromShiftId);
    const ward = wardOf(wardId);
    const patientsData = dashboard(wardId).flatMap((b) => b.admissions.map((a) => ({
      name: a.patient.name,
      bed: b.code,
      diagnosis: a.diagnosis ?? "—",
      openConducts: a.visits.flatMap((v) => v.conducts.map((c) => c.description)),
      alerts: a.visits.flatMap((v) => v.alerts.map((al) => al.description)),
    })));
    const lines = patientsData.map((p) =>
      `Leito ${p.bed} — ${p.name} (${p.diagnosis}): ${p.openConducts.length} conduta(s) em aberto${p.alerts.length ? `, atenção: ${p.alerts.join("; ")}` : ""}.`);
    const h: ShiftHandoff = {
      id: newId("h"), wardId, fromShiftId: String(body.fromShiftId), toShiftId: null,
      generatedAt: new Date().toISOString(), status: "PENDING",
      summaryJson: {
        text: `Passagem de plantão — ${ward.name}. ${patientsData.length} paciente(s) internado(s).\n${lines.join("\n")}`,
        data: { wardName: ward.name, shiftType: fromShift?.type ?? "MORNING", patients: patientsData },
      },
      ward: { id: ward.id, name: ward.name },
      fromShift: fromShift ? { id: fromShift.id, type: fromShift.type, nurse: { name: fromShift.nurse?.name ?? "" } } : undefined,
      toShift: null,
      acks: [],
    };
    handoffs.push(h);
    return h;
  }],
  ["GET", /^\/handoffs\/([^/]+)$/, (m) => {
    const h = handoffs.find((x) => x.id === m[1]);
    if (!h) throw new DemoApiError(404, "Passagem de plantão não encontrada");
    return h;
  }],
  ["POST", /^\/handoffs\/([^/]+)\/acknowledge$/, (m) => {
    const h = handoffs.find((x) => x.id === m[1]);
    if (!h) throw new DemoApiError(404, "Passagem de plantão não encontrada");
    const ack = { id: newId("ack"), handoffId: h.id, userId: "demo", acknowledgedAt: new Date().toISOString(), user: { name: "Usuário da demonstração", role: "NURSE" } };
    h.acks = [...(h.acks ?? []), ack];
    h.status = "ACKNOWLEDGED";
    return ack;
  }],

  ["GET", /^\/analytics\/ward\/([^/]+)$/, (m) => {
    const wardBeds = beds.filter((b) => b.wardId === m[1]);
    const occupied = wardBeds.filter((b) => b.status === "OCCUPIED").length;
    return {
      wardId: m[1], totalBeds: wardBeds.length, occupiedBeds: occupied,
      occupancyRate: rate(occupied, wardBeds.length),
      activeAdmissions: admissions.filter((a) => a.status === "ACTIVE" && bedOf(a.bedId).wardId === m[1]).length,
    };
  }],
  ["GET", /^\/analytics\/compliance$/, () => {
    const all = allConducts();
    const resolved = all.filter((c) => c.status === "RESOLVED").length;
    return { totalConducts: all.length, resolvedConducts: resolved, complianceRate: rate(resolved, all.length), from: ago(720), to: ago(0) };
  }],
  ["GET", /^\/analytics\/handoffs$/, () => {
    const total = handoffs.length + 12;
    const acked = handoffs.filter((h) => h.status === "ACKNOWLEDGED").length + 11;
    return { totalHandoffs: total, acknowledgedHandoffs: acked, ackRate: rate(acked, total), from: ago(720), to: ago(0) };
  }],

  ["POST", /^\/near-misses$/, (_m, body) => {
    const nm: NearMiss = {
      id: newId("nm"), hospitalId: HOSPITAL_ID, wardId: (body.wardId as string) ?? null, reportedAt: new Date().toISOString(),
      category: body.category as NearMiss["category"], severity: body.severity as NearMiss["severity"],
      description: String(body.description), isAnonymous: Boolean(body.isAnonymous),
    };
    nearMisses.unshift(nm);
    return nm;
  }],
  ["GET", /^\/near-misses\/summary$/, () => ({
    total: nearMisses.length,
    byCategory: count(nearMisses, (n) => n.category, "category"),
    bySeverity: count(nearMisses, (n) => n.severity, "severity"),
  })],
  ["GET", /^\/near-misses\/patterns$/, () => nearMisses],

  ["GET", /^\/notifications$/, (_m, _b, q) => {
    const items = notifications.filter((n) => q.get("unreadOnly") !== "true" || !n.readAt);
    return { total: items.length, unreadCount: notifications.filter((n) => !n.readAt).length, skip: 0, take: items.length, items };
  }],
  ["PATCH", /^\/notifications\/([^/]+)\/read$/, (m) => {
    const n = notifications.find((x) => x.id === m[1]);
    if (!n) throw new DemoApiError(404, "Notificação não encontrada");
    n.readAt = new Date().toISOString();
    return n;
  }],
  ["POST", /^\/notifications\/read-all$/, () => {
    const unread = notifications.filter((n) => !n.readAt);
    unread.forEach((n) => { n.readAt = new Date().toISOString(); });
    return { updated: unread.length };
  }],
  ["GET", /^\/notifications\/public-key$/, () => ({ publicKey: null, enabled: false })],

  ["GET", /^\/family\/patient\/([^/]+)\/updates$/, (m) => {
    const fc = admissions.flatMap((a) => a.familyContacts).find((f) => f.accessToken === m[1]);
    if (!fc) throw new DemoApiError(404, "Link inválido");
    return familyUpdates.filter((u) => u.admissionId === fc.admissionId);
  }],
  ["GET", /^\/family\/patient\/([^/]+)\/summary$/, (m) => {
    const fc = admissions.flatMap((a) => a.familyContacts).find((f) => f.accessToken === m[1]);
    if (!fc) throw new DemoApiError(404, "Link inválido");
    const a = admissions.find((x) => x.id === fc.admissionId)!;
    return { patientName: patientOf(a.patientId).name, summary: familyUpdates[0]?.contentLay ?? "", generatedAt: familyUpdates[0]?.generatedAt ?? null };
  }],
  ["POST", /^\/family\/patient\/([^/]+)\/messages$/, (m, body) => {
    const fc = admissions.flatMap((a) => a.familyContacts).find((f) => f.accessToken === m[1]);
    if (!fc) throw new DemoApiError(404, "Link inválido");
    const msg: FamilyMessage = { id: newId("fm"), admissionId: fc.admissionId, fromFamily: true, content: String(body.content), sentAt: new Date().toISOString(), readAt: null };
    familyMessages.push(msg);
    return msg;
  }],
];

/** Responde a uma chamada da API a partir dos dados em memória. */
export async function demoFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const method = (options?.method ?? "GET").toUpperCase();
  const [pathname, search = ""] = path.split("?");
  const query = new URLSearchParams(search);
  let body: Record<string, unknown> = {};
  if (typeof options?.body === "string") {
    try {
      body = JSON.parse(options.body) as Record<string, unknown>;
    } catch {
      body = {};
    }
  }

  // Latência curta para os estados de carregamento aparecerem como na API real.
  await new Promise((resolve) => setTimeout(resolve, 150));

  for (const [routeMethod, pattern, handler] of routes) {
    if (routeMethod !== method) continue;
    const match = pathname.match(pattern);
    if (match) {
      // Clona para o React Query não compartilhar referências com o "banco".
      return structuredClone(handler(match, body, query)) as T;
    }
  }
  throw new DemoApiError(404, `Rota não disponível na demonstração: ${method} ${pathname}`);
}
