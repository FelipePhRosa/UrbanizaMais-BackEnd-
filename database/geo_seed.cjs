// Seed idempotente de estados, municípios (IBGE) e bairros reais.
// Uso: node database/geo_seed.cjs   (ou npm run seed:geo)
// Apenas INSERTs do que falta — não altera nem remove dados existentes.

const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const knex = require("knex");

const connection = knex({
  client: process.env.DB_CONNECTION || "mysql2",
  connection: {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "zenite",
    port: Number(process.env.DB_PORT) || 3306,
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "urbanizamais",
  },
});

const STATES = [
  { uf: "AC", name: "Acre" },
  { uf: "AL", name: "Alagoas" },
  { uf: "AP", name: "Amapá" },
  { uf: "AM", name: "Amazonas" },
  { uf: "BA", name: "Bahia" },
  { uf: "CE", name: "Ceará" },
  { uf: "DF", name: "Distrito Federal" },
  { uf: "ES", name: "Espírito Santo" },
  { uf: "GO", name: "Goiás" },
  { uf: "MA", name: "Maranhão" },
  { uf: "MT", name: "Mato Grosso" },
  { uf: "MS", name: "Mato Grosso do Sul" },
  { uf: "MG", name: "Minas Gerais" },
  { uf: "PA", name: "Pará" },
  { uf: "PB", name: "Paraíba" },
  { uf: "PR", name: "Paraná" },
  { uf: "PE", name: "Pernambuco" },
  { uf: "PI", name: "Piauí" },
  { uf: "RJ", name: "Rio de Janeiro" },
  { uf: "RN", name: "Rio Grande do Norte" },
  { uf: "RS", name: "Rio Grande do Sul" },
  { uf: "RO", name: "Rondônia" },
  { uf: "RR", name: "Roraima" },
  { uf: "SC", name: "Santa Catarina" },
  { uf: "SP", name: "São Paulo" },
  { uf: "SE", name: "Sergipe" },
  { uf: "TO", name: "Tocantins" },
];

const CHUNK = 500;

async function resolveAdminUserId() {
  const admin = await connection("users").where({ role: "1" }).orderBy("id", "asc").first();
  if (admin) return admin.id;
  const anyUser = await connection("users").orderBy("id", "asc").first();
  return anyUser ? anyUser.id : null;
}

async function seedStates() {
  const existing = await connection("states").select("id", "name", "uf");
  const byUf = new Map(existing.map((s) => [s.uf, s]));
  const inserted = [];
  for (const st of STATES) {
    if (byUf.has(st.uf)) continue;
    const [id] = await connection("states").insert({ name: st.name, uf: st.uf });
    byUf.set(st.uf, { id, name: st.name, uf: st.uf });
    inserted.push(`${st.uf}(id ${id})`);
  }
  console.log(`[states] existentes: ${existing.length} | inseridos agora: ${inserted.length}`);
  if (inserted.length) console.log(`         -> ${inserted.join(", ")}`);
  return byUf;
}

async function seedCities(statesByUf, adminId) {
  const municipios = JSON.parse(
    fs.readFileSync(path.join(__dirname, "data", "municipios.json"), "utf8")
  );
  const existing = await connection("cities").select("name", "state_id");
  const seen = new Set(existing.map((c) => `${c.name}|${c.state_id}`));

  const toInsert = [];
  let totalExpected = 0;
  for (const uf of Object.keys(municipios)) {
    const state = statesByUf.get(uf);
    if (!state) throw new Error(`Estado ${uf} não encontrado após seed de states.`);
    for (const name of municipios[uf]) {
      totalExpected++;
      const key = `${name}|${state.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      toInsert.push({ name, state_id: state.id, created_by: adminId });
    }
  }

  for (let i = 0; i < toInsert.length; i += CHUNK) {
    await connection("cities").insert(toInsert.slice(i, i + CHUNK));
  }
  const totalNow = await connection("cities").count("* as total").first();
  console.log(
    `[cities] esperados no dataset: ${totalExpected} | existentes antes: ${existing.length} | inseridos agora: ${toInsert.length} | total na tabela: ${totalNow.total}`
  );
  return toInsert.length;
}

async function seedNeighborhoods(statesByUf, adminId) {
  const bairros = JSON.parse(
    fs.readFileSync(path.join(__dirname, "data", "bairros.json"), "utf8")
  );
  let totalInserted = 0;
  for (const uf of Object.keys(bairros)) {
    const state = statesByUf.get(uf);
    if (!state) throw new Error(`Estado ${uf} não encontrado para bairros.`);
    for (const cityName of Object.keys(bairros[uf])) {
      const city = await connection("cities")
        .where({ name: cityName, state_id: state.id })
        .first();
      if (!city) {
        console.warn(`[neighborhoods] cidade não encontrada: ${cityName}/${uf} — pulando.`);
        continue;
      }
      const existing = await connection("neighborhoods")
        .where({ city_id: city.id })
        .select("name");
      const seen = new Set(existing.map((n) => n.name));
      const toInsert = bairros[uf][cityName]
        .filter((name) => !seen.has(name))
        .map((name) => ({ name, city_id: city.id, created_by: adminId }));
      if (toInsert.length) await connection("neighborhoods").insert(toInsert);
      totalInserted += toInsert.length;
      console.log(
        `[neighborhoods] ${cityName}/${uf}: existentes ${existing.length} | inseridos agora ${toInsert.length} | total ${existing.length + toInsert.length}`
      );
    }
  }
  return totalInserted;
}

async function main() {
  const adminId = await resolveAdminUserId();
  if (!adminId) {
    throw new Error(
      "Nenhum usuário encontrado em users — crie ao menos um usuário antes de rodar o seed (created_by é obrigatório)."
    );
  }
  console.log(`[seed] created_by = user id ${adminId}`);

  const statesByUf = await seedStates();
  await seedCities(statesByUf, adminId);
  await seedNeighborhoods(statesByUf, adminId);

  const stateTotal = await connection("states").count("* as total").first();
  const cityTotal = await connection("cities").count("* as total").first();
  const hoodTotal = await connection("neighborhoods").count("* as total").first();
  console.log(
    `\n[ok] Totais finais — states: ${stateTotal.total} | cities: ${cityTotal.total} | neighborhoods: ${hoodTotal.total}`
  );
  console.log("[ok] Seed idempotente: pode ser executado novamente sem duplicar dados.");
}

main()
  .catch((err) => {
    console.error("[seed] Falhou:", err.message);
    process.exitCode = 1;
  })
  .finally(() => connection.destroy());
