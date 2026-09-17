// Creates the schema and the in-database masking primitives:
//   pii_sensitivity(type) -> how restricted a PII kind is
//   redact(body, spans, clearance) -> body with under-cleared spans blacked out
// Run with: npm run db:setup
import { sql } from '../src/lib/db'

const statements: string[] = [
  `create table if not exists messages (
     id serial primary key,
     source text not null default 'seed',
     body text not null,
     spans jsonb not null default '[]'::jsonb,
     created_at timestamptz not null default now()
   )`,

  // Per-IP, per-day counter that backs the classify rate limit.
  `create table if not exists rate_limits (
     ip text not null,
     day date not null,
     count int not null default 0,
     primary key (ip, day)
   )`,

  `create or replace function pii_sensitivity(t text) returns int
   language sql immutable as $$
     select case t
       when 'name' then 1
       when 'email' then 2
       when 'phone' then 2
       when 'address' then 3
       when 'id_number' then 3
       else 99
     end
   $$`,

  `create or replace function redact(in_body text, in_spans jsonb, in_clearance int)
   returns text language plpgsql immutable as $$
   declare
     rec record;
     result text := in_body;
   begin
     for rec in
       select value as span
       from jsonb_array_elements(in_spans)
       order by char_length(value->>'text') desc
     loop
       if pii_sensitivity(rec.span->>'type') > in_clearance then
         result := replace(
           result,
           rec.span->>'text',
           repeat('█', greatest(char_length(rec.span->>'text'), 3))
         );
       end if;
     end loop;
     return result;
   end;
   $$`,
]

async function main() {
  for (const stmt of statements) {
    await sql.query(stmt)
    console.log('ok:', stmt.trim().split('\n')[0], '...')
  }
  console.log('\nSchema and masking functions are ready.')
}

main()
