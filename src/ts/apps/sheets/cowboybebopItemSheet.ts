import { grooveItem, moduleId, sessionTypeItem } from "../../constants";
import { grooveEditor, wireGrooveEditor } from "../../grooves";
import { riffEditor, wireRiffEditor } from "../../riffs";

export default class CowboyBebopItemSheet extends ItemSheet {
  override get template() {
    return `systems/${moduleId}/templates/sheets/item/item-sheet-${this.item.type}.hbs`;
  }

  override async getData() {
    const data: any = await super.getData();

    if (this.item.type === sessionTypeItem) {
      // Aucun mouvement courant : un type de session ne se joue pas, il se
      // prépare. Les trois blocs s'ouvrent donc à la demande.
      data.riffEditor = riffEditor(this.item);
    }

    if (this.item.type === grooveItem) {
      data.groove = grooveEditor(this.item);
    }

    return data;
  }

  override activateListeners(html: JQuery) {
    super.activateListeners(html);

    if (!this.options.editable) return;

    if (this.item.type === sessionTypeItem) wireRiffEditor(html, this.item);
    if (this.item.type === grooveItem) wireGrooveEditor(html, this.item);
  }
}
