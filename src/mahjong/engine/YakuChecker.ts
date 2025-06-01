import { Tile, tilesEqual, isTerminal, isHonor, isSimple, isDragon, isWind, isTerminalOrHonor } from '../types/tile';
import { Hand, WinCondition, GameContext, getAllHandTiles } from '../types/hand';
import { Yaku, YakuResult, RIICHI, IPPATSU, MENZEN_TSUMO, PINFU, TANYAO, IIPEIKOU, YAKUHAI_HAKU, YAKUHAI_HATSU, YAKUHAI_CHUN, YAKUHAI_BAKAZE, YAKUHAI_JIKAZE, RINSHAN_KAIHOU, CHANKAN, HAITEI, HOUTEI, SANSHOKU_DOUJUN, SANSHOKU_DOUKOU, ITTSU, TOITOI, SANANKOU, SANKANTSU, HONROUTOU, SHOUSANGEN, DOUBLE_RIICHI, CHIITOITSU, HONITSU, JUNCHAN, RYANPEIKOU, CHINITSU } from '../types/yaku';
import { TileGroup } from '../utils/tileAnalysis';

export class YakuChecker {
  checkYaku(
    hand: Hand,
    winCondition: WinCondition,
    context: GameContext,
    completedHand: TileGroup[]
  ): YakuResult {
    const yakuList: Yaku[] = [];
    let totalHan = 0;
    const fu = this.calculateFu(hand, winCondition, context, completedHand);

    // Check for yakuman first
    const yakumanList = this.checkYakuman(hand, winCondition, context, completedHand);
    if (yakumanList.length > 0) {
      return {
        yaku: yakumanList,
        han: yakumanList.reduce((sum, y) => sum + y.han, 0),
        fu: 0, // Fu doesn't matter for yakuman
        isYakuman: true
      };
    }

    // 1-han yaku
    if (hand.riichi) {
      yakuList.push(RIICHI);
    }

    if (hand.ippatsu && hand.riichi) {
      yakuList.push(IPPATSU);
    }

    if (winCondition.isTsumo && hand.menzen) {
      yakuList.push(MENZEN_TSUMO);
    }

    if (this.checkPinfu(hand, completedHand, winCondition, context)) {
      yakuList.push(PINFU);
    }

    if (this.checkTanyao(hand)) {
      yakuList.push(TANYAO);
    }

    if (this.checkIipeikou(hand, completedHand)) {
      yakuList.push(IIPEIKOU);
    }

    const yakuhaiList = this.checkYakuhai(hand, completedHand, context);
    yakuList.push(...yakuhaiList);

    if (winCondition.isRinshan) {
      yakuList.push(RINSHAN_KAIHOU);
    }

    if (winCondition.isChankan) {
      yakuList.push(CHANKAN);
    }

    if (winCondition.isHaitei && winCondition.isTsumo) {
      yakuList.push(HAITEI);
    }

    if (winCondition.isHoutei && !winCondition.isTsumo) {
      yakuList.push(HOUTEI);
    }

    // 2-han yaku
    if (winCondition.isDoubleRiichi) {
      yakuList.push(DOUBLE_RIICHI);
    }

    if (this.checkSanshokuDoujun(hand, completedHand)) {
      yakuList.push(SANSHOKU_DOUJUN);
    }

    if (this.checkSanshokuDoukou(hand, completedHand)) {
      yakuList.push(SANSHOKU_DOUKOU);
    }

    if (this.checkIttsu(hand, completedHand)) {
      yakuList.push(ITTSU);
    }

    if (this.checkToitoi(completedHand)) {
      yakuList.push(TOITOI);
    }

    if (this.checkSanankou(hand, completedHand, winCondition)) {
      yakuList.push(SANANKOU);
    }

    if (this.checkSankantsu(hand)) {
      yakuList.push(SANKANTSU);
    }

    if (this.checkHonroutou(completedHand)) {
      yakuList.push(HONROUTOU);
    }

    if (this.checkShousangen(completedHand)) {
      yakuList.push(SHOUSANGEN);
    }

    if (this.checkChiitoitsu(completedHand)) {
      yakuList.push(CHIITOITSU);
    }

    // 3-han yaku
    if (this.checkHonitsu(hand)) {
      yakuList.push(HONITSU);
    }

    if (this.checkJunchan(hand, completedHand)) {
      yakuList.push(JUNCHAN);
    }

    if (this.checkRyanpeikou(hand, completedHand)) {
      yakuList.push(RYANPEIKOU);
    }

    // 6-han yaku
    if (this.checkChinitsu(hand)) {
      yakuList.push(CHINITSU);
    }

    // Calculate han with closed hand reduction
    for (const yaku of yakuList) {
      let han = yaku.han;
      // Some yaku have reduced han when the hand is open
      if (!hand.menzen && (yaku === SANSHOKU_DOUJUN || yaku === ITTSU || yaku === HONITSU || yaku === JUNCHAN || yaku === CHINITSU)) {
        han = Math.max(1, han - 1);
      }
      totalHan += han;
    }

    // Add dora
    const doraCount = this.countDora(hand, context);
    totalHan += doraCount;

    return {
      yaku: yakuList,
      han: totalHan,
      fu,
      isYakuman: false
    };
  }

  private checkYakuman(/* hand: Hand, winCondition: WinCondition, context: GameContext, completedHand: TileGroup[] */): Yaku[] {
    // Implement yakuman checks here
    // For now, return empty array
    return [];
  }

  private calculateFu(hand: Hand, winCondition: WinCondition, _context: GameContext, completedHand: TileGroup[]): number {
    // Basic implementation of fu calculation
    // This is simplified - full fu calculation is quite complex
    let fu = 20; // Base fu

    // Winning method
    if (!winCondition.isTsumo && hand.menzen) {
      fu += 10; // Menzen ron
    }

    // Add fu for melds
    for (const group of completedHand) {
      if (group.type === 'triplet') {
        const tile = group.tiles[0];
        let meldFu = 2;
        if (isTerminalOrHonor(tile)) {
          meldFu *= 2;
        }
        // Check if it's a closed triplet
        const isClosedTriplet = !hand.melds.some(meld => 
          meld.tiles.some(t => tilesEqual(t, tile)) && meld.isOpen
        );
        if (isClosedTriplet) {
          meldFu *= 2;
        }
        fu += meldFu;
      }
    }

    // Round up to nearest 10
    return Math.ceil(fu / 10) * 10;
  }

  private checkPinfu(hand: Hand, completedHand: TileGroup[], _winCondition: WinCondition, context: GameContext): boolean {
    if (!hand.menzen) return false;

    // All groups except the pair must be sequences
    const sequences = completedHand.filter(g => g.type === 'sequence');
    if (sequences.length !== 4) return false;

    // The pair must not be value tiles
    const pair = completedHand.find(g => g.type === 'pair');
    if (!pair) return false;
    
    const pairTile = pair.tiles[0];
    if (isDragon(pairTile)) return false;
    if (isWind(pairTile)) {
      // Check if it's round wind or seat wind
      if (pairTile.honor === context.roundWind || pairTile.honor === context.playerWind) {
        return false;
      }
    }

    // Must be a two-sided wait
    // This is simplified - proper implementation would check the actual wait pattern
    return true;
  }

  private checkTanyao(hand: Hand): boolean {
    const allTiles = getAllHandTiles(hand);
    return allTiles.every(tile => isSimple(tile));
  }

  private checkIipeikou(hand: Hand, completedHand: TileGroup[]): boolean {
    if (!hand.menzen) return false;

    const sequences = completedHand.filter(g => g.type === 'sequence');
    
    // Check for identical sequences
    for (let i = 0; i < sequences.length; i++) {
      for (let j = i + 1; j < sequences.length; j++) {
        const seq1 = sequences[i].tiles;
        const seq2 = sequences[j].tiles;
        
        if (seq1.every((tile, index) => tilesEqual(tile, seq2[index]))) {
          return true;
        }
      }
    }

    return false;
  }

  private checkYakuhai(hand: Hand, completedHand: TileGroup[], context: GameContext): Yaku[] {
    const yakuhaiList: Yaku[] = [];

    for (const group of completedHand) {
      if (group.type === 'triplet') {
        const tile = group.tiles[0];
        if (tile.type === 'honor') {
          if (tile.honor === 'white') yakuhaiList.push(YAKUHAI_HAKU);
          if (tile.honor === 'green') yakuhaiList.push(YAKUHAI_HATSU);
          if (tile.honor === 'red') yakuhaiList.push(YAKUHAI_CHUN);
          if (tile.honor === context.roundWind) yakuhaiList.push(YAKUHAI_BAKAZE);
          if (tile.honor === context.playerWind) yakuhaiList.push(YAKUHAI_JIKAZE);
        }
      }
    }

    // Also check melds
    for (const meld of hand.melds) {
      if (meld.type === 'pon' || meld.type === 'kan' || meld.type === 'ankan' || meld.type === 'minkan') {
        const tile = meld.tiles[0];
        if (tile.type === 'honor') {
          if (tile.honor === 'white') yakuhaiList.push(YAKUHAI_HAKU);
          if (tile.honor === 'green') yakuhaiList.push(YAKUHAI_HATSU);
          if (tile.honor === 'red') yakuhaiList.push(YAKUHAI_CHUN);
          if (tile.honor === context.roundWind) yakuhaiList.push(YAKUHAI_BAKAZE);
          if (tile.honor === context.playerWind) yakuhaiList.push(YAKUHAI_JIKAZE);
        }
      }
    }

    // Remove duplicates
    return [...new Set(yakuhaiList)];
  }

  private checkSanshokuDoujun(hand: Hand, completedHand: TileGroup[]): boolean {
    const sequences = completedHand.filter(g => g.type === 'sequence');
    
    // Group sequences by their starting number
    const sequencesByNumber = new Map<number, Tile[][]>();
    
    for (const seq of sequences) {
      const startNum = seq.tiles[0].number!;
      const existing = sequencesByNumber.get(startNum) || [];
      existing.push(seq.tiles);
      sequencesByNumber.set(startNum, existing);
    }

    // Check melds too
    for (const meld of hand.melds) {
      if (meld.type === 'chi') {
        const startNum = meld.tiles[0].number!;
        const existing = sequencesByNumber.get(startNum) || [];
        existing.push(meld.tiles);
        sequencesByNumber.set(startNum, existing);
      }
    }

    // Check if any starting number has sequences in all three suits
    for (const sequences of sequencesByNumber.values()) {
      const suits = new Set(sequences.map(seq => seq[0].type));
      if (suits.size === 3) {
        return true;
      }
    }

    return false;
  }

  private checkSanshokuDoukou(hand: Hand, completedHand: TileGroup[]): boolean {
    const triplets = completedHand.filter(g => g.type === 'triplet');
    
    // Group triplets by their number
    const tripletsByNumber = new Map<number, Tile[][]>();
    
    for (const triplet of triplets) {
      if (triplet.tiles[0].type !== 'honor') {
        const num = triplet.tiles[0].number!;
        const existing = tripletsByNumber.get(num) || [];
        existing.push(triplet.tiles);
        tripletsByNumber.set(num, existing);
      }
    }

    // Check melds too
    for (const meld of hand.melds) {
      if ((meld.type === 'pon' || meld.type === 'kan' || meld.type === 'ankan' || meld.type === 'minkan') && meld.tiles[0].type !== 'honor') {
        const num = meld.tiles[0].number!;
        const existing = tripletsByNumber.get(num) || [];
        existing.push(meld.tiles);
        tripletsByNumber.set(num, existing);
      }
    }

    // Check if any number has triplets in all three suits
    for (const triplets of tripletsByNumber.values()) {
      const suits = new Set(triplets.map(t => t[0].type));
      if (suits.size === 3) {
        return true;
      }
    }

    return false;
  }

  private checkIttsu(hand: Hand, completedHand: TileGroup[]): boolean {
    const sequencesBySuit = new Map<string, number[]>();

    // Collect sequences from completed hand
    for (const group of completedHand) {
      if (group.type === 'sequence') {
        const suit = group.tiles[0].type;
        const startNum = group.tiles[0].number!;
        const existing = sequencesBySuit.get(suit) || [];
        existing.push(startNum);
        sequencesBySuit.set(suit, existing);
      }
    }

    // Collect sequences from melds
    for (const meld of hand.melds) {
      if (meld.type === 'chi') {
        const suit = meld.tiles[0].type;
        const startNum = meld.tiles[0].number!;
        const existing = sequencesBySuit.get(suit) || [];
        existing.push(startNum);
        sequencesBySuit.set(suit, existing);
      }
    }

    // Check if any suit has 1-2-3, 4-5-6, 7-8-9
    for (const startNums of sequencesBySuit.values()) {
      if (startNums.includes(1) && startNums.includes(4) && startNums.includes(7)) {
        return true;
      }
    }

    return false;
  }

  private checkToitoi(completedHand: TileGroup[]): boolean {
    const tripletCount = completedHand.filter(g => g.type === 'triplet').length;
    return tripletCount === 4;
  }

  private checkSanankou(hand: Hand, completedHand: TileGroup[], winCondition: WinCondition): boolean {
    let closedTripletCount = 0;

    // Count closed triplets from completed hand
    for (const group of completedHand) {
      if (group.type === 'triplet') {
        const tile = group.tiles[0];
        const isInOpenMeld = hand.melds.some(meld => 
          meld.isOpen && meld.tiles.some(t => tilesEqual(t, tile))
        );
        if (!isInOpenMeld) {
          // For ron, the winning tile's triplet doesn't count as closed
          if (!winCondition.isTsumo && tilesEqual(tile, winCondition.winTile)) {
            continue;
          }
          closedTripletCount++;
        }
      }
    }

    // Count closed kans
    for (const meld of hand.melds) {
      if (meld.type === 'ankan') {
        closedTripletCount++;
      }
    }

    return closedTripletCount >= 3;
  }

  private checkSankantsu(hand: Hand): boolean {
    const kanCount = hand.melds.filter(meld => 
      meld.type === 'kan' || meld.type === 'ankan' || meld.type === 'minkan'
    ).length;
    return kanCount === 3;
  }

  private checkHonroutou(completedHand: TileGroup[]): boolean {
    const allTiles = getAllHandTilesFromGroups(completedHand);
    return allTiles.every(tile => isTerminalOrHonor(tile));
  }

  private checkShousangen(completedHand: TileGroup[]): boolean {
    let dragonTripletCount = 0;
    let dragonPairCount = 0;

    for (const group of completedHand) {
      const tile = group.tiles[0];
      if (isDragon(tile)) {
        if (group.type === 'triplet') {
          dragonTripletCount++;
        } else if (group.type === 'pair') {
          dragonPairCount++;
        }
      }
    }

    return dragonTripletCount === 2 && dragonPairCount === 1;
  }

  private checkChiitoitsu(completedHand: TileGroup[]): boolean {
    return completedHand.length === 7 && completedHand.every(g => g.type === 'pair');
  }

  private checkHonitsu(hand: Hand): boolean {
    const allTiles = getAllHandTiles(hand);
    const suits = new Set<string>();
    let hasHonor = false;

    for (const tile of allTiles) {
      if (tile.type === 'honor') {
        hasHonor = true;
      } else {
        suits.add(tile.type);
      }
    }

    return suits.size === 1 && hasHonor;
  }

  private checkJunchan(hand: Hand, completedHand: TileGroup[]): boolean {
    // All groups must contain terminals (no honors)
    for (const group of completedHand) {
      const hasTerminal = group.tiles.some(tile => isTerminal(tile));
      const hasHonor = group.tiles.some(tile => isHonor(tile));
      if (!hasTerminal || hasHonor) {
        return false;
      }
    }

    // Check melds
    for (const meld of hand.melds) {
      const hasTerminal = meld.tiles.some(tile => isTerminal(tile));
      const hasHonor = meld.tiles.some(tile => isHonor(tile));
      if (!hasTerminal || hasHonor) {
        return false;
      }
    }

    return true;
  }

  private checkRyanpeikou(hand: Hand, completedHand: TileGroup[]): boolean {
    if (!hand.menzen) return false;

    const sequences = completedHand.filter(g => g.type === 'sequence');
    let pairCount = 0;

    // Check for two sets of identical sequences
    const used = new Set<number>();
    
    for (let i = 0; i < sequences.length; i++) {
      if (used.has(i)) continue;
      
      for (let j = i + 1; j < sequences.length; j++) {
        if (used.has(j)) continue;
        
        const seq1 = sequences[i].tiles;
        const seq2 = sequences[j].tiles;
        
        if (seq1.every((tile, index) => tilesEqual(tile, seq2[index]))) {
          pairCount++;
          used.add(i);
          used.add(j);
          break;
        }
      }
    }

    return pairCount === 2;
  }

  private checkChinitsu(hand: Hand): boolean {
    const allTiles = getAllHandTiles(hand);
    const suits = new Set<string>();

    for (const tile of allTiles) {
      if (tile.type === 'honor') {
        return false;
      }
      suits.add(tile.type);
    }

    return suits.size === 1;
  }

  private countDora(hand: Hand, context: GameContext): number {
    let count = 0;
    const allTiles = getAllHandTiles(hand);

    for (const tile of allTiles) {
      for (const dora of context.doras) {
        if (tilesEqual(tile, dora)) {
          count++;
        }
      }
      
      // Ura dora (only if riichi)
      if (hand.riichi && context.uraDoras) {
        for (const uraDora of context.uraDoras) {
          if (tilesEqual(tile, uraDora)) {
            count++;
          }
        }
      }
    }

    return count;
  }
}

function getAllHandTilesFromGroups(groups: TileGroup[]): Tile[] {
  const tiles: Tile[] = [];
  for (const group of groups) {
    tiles.push(...group.tiles);
  }
  return tiles;
}