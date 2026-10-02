// Seeds the database from the product catalogues in /docs/source.
// Placeholder until the schema migrations exist. Run with `pnpm seed`.

async function main() {
  console.log("Nothing to seed yet — add migrations first.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
