// Foundry 13+ ne déclenche plus le hook jQuery de la v12. Ce contrat statique
// garde l'inscription du système alignée sur les versions annoncées dans son
// manifeste ; le comportement du bouton est couvert séparément par le rendu du
// vrai gabarit dans chat-card.mjs.

import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../src/ts/module.ts", import.meta.url),
  "utf8"
);

if (!source.includes('"renderChatMessageHTML"')) {
  throw new Error("Le clic de collecte n'est pas branché au hook Foundry 13+");
}
if (/Hooks\.on\([\s\r\n]*["']renderChatMessage["']/.test(source)) {
  throw new Error("Le vieux hook jQuery de Foundry 12 est encore utilisé");
}

console.log("ok   les actions du chat utilisent le hook Foundry 13+");
