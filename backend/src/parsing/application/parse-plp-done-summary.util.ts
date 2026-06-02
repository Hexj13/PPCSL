export interface PlpDoneSummary {
  pagesScanned: number;
  cardsFound: number;
  newItems: number;
  duplicates: number;
  existingListings: number;
  readyForImport: number;
  missingCandidates: number;
  closeEstimate: number;
  closeValid: number;
  activeItems: number;
  closedItems: number;
}

export function parsePlpDoneSummary(line: string): PlpDoneSummary | null {
  const full = line.match(
    /\[DONE\] pagesScanned=(\d+) cardsFound=(\d+) new=(\d+) duplicates=(\d+) existingListings=(\d+) readyForImport=(\d+) missingCandidates=(\d+) closeEstimate=(\d+) closeValid=(\d+) activeItems=(\d+) closedItems=(\d+)/,
  );
  if (full) {
    return {
      pagesScanned: Number(full[1]),
      cardsFound: Number(full[2]),
      newItems: Number(full[3]),
      duplicates: Number(full[4]),
      existingListings: Number(full[5]),
      readyForImport: Number(full[6]),
      missingCandidates: Number(full[7]),
      closeEstimate: Number(full[8]),
      closeValid: Number(full[9]),
      activeItems: Number(full[10]),
      closedItems: Number(full[11]),
    };
  }

  const compact = line.match(/\[DONE\] pages=(\d+) cardsFound=(\d+) new=(\d+) duplicates=(\d+)/);
  if (!compact) {
    return null;
  }
  return {
    pagesScanned: Number(compact[1]),
    cardsFound: Number(compact[2]),
    newItems: Number(compact[3]),
    duplicates: Number(compact[4]),
    existingListings: 0,
    readyForImport: Number(compact[3]),
    missingCandidates: 0,
    closeEstimate: 0,
    closeValid: 0,
    activeItems: 0,
    closedItems: 0,
  };
}
