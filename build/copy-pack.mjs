import fs from "fs-extra";

/**
 * Replace a LevelDB pack as one directory instead of merging its files.
 *
 * LevelDB filenames are generations, not assets: retaining one old `.ldb`
 * file can resurrect deleted documents. The compiled pack is staged first;
 * renaming the live directory then either succeeds as a unit or fails while
 * Foundry holds it open. A failed second rename restores the previous pack.
 */
export async function replacePackDirectory(source, destination) {
  const staged = `${destination}.next`;
  const previous = `${destination}.previous`;

  await fs.remove(staged);
  await fs.copy(source, staged);

  try {
    await fs.remove(previous);
    if (await fs.pathExists(destination)) {
      await fs.move(destination, previous);
    }
    await fs.move(staged, destination);
    await fs.remove(previous);
  } catch (error) {
    if (!(await fs.pathExists(destination)) && await fs.pathExists(previous)) {
      await fs.move(previous, destination);
    }
    await fs.remove(staged);
    throw error;
  }
}
