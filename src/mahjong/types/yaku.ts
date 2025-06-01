export interface Yaku {
  name: string;
  englishName: string;
  han: number;
  isYakuman?: boolean;
  requiresClosed?: boolean;
}

// 1翻役
export const RIICHI: Yaku = { name: '立直', englishName: 'Riichi', han: 1, requiresClosed: true };
export const IPPATSU: Yaku = { name: '一発', englishName: 'Ippatsu', han: 1, requiresClosed: true };
export const MENZEN_TSUMO: Yaku = { name: '門前清自摸和', englishName: 'Menzen Tsumo', han: 1, requiresClosed: true };
export const PINFU: Yaku = { name: '平和', englishName: 'Pinfu', han: 1, requiresClosed: true };
export const TANYAO: Yaku = { name: '断么九', englishName: 'Tanyao', han: 1 };
export const IIPEIKOU: Yaku = { name: '一盃口', englishName: 'Iipeikou', han: 1, requiresClosed: true };
export const YAKUHAI_HAKU: Yaku = { name: '役牌 白', englishName: 'Yakuhai Haku', han: 1 };
export const YAKUHAI_HATSU: Yaku = { name: '役牌 發', englishName: 'Yakuhai Hatsu', han: 1 };
export const YAKUHAI_CHUN: Yaku = { name: '役牌 中', englishName: 'Yakuhai Chun', han: 1 };
export const YAKUHAI_BAKAZE: Yaku = { name: '役牌 場風', englishName: 'Yakuhai Bakaze', han: 1 };
export const YAKUHAI_JIKAZE: Yaku = { name: '役牌 自風', englishName: 'Yakuhai Jikaze', han: 1 };
export const RINSHAN_KAIHOU: Yaku = { name: '嶺上開花', englishName: 'Rinshan Kaihou', han: 1 };
export const CHANKAN: Yaku = { name: '槍槓', englishName: 'Chankan', han: 1 };
export const HAITEI: Yaku = { name: '海底摸月', englishName: 'Haitei', han: 1 };
export const HOUTEI: Yaku = { name: '河底撈魚', englishName: 'Houtei', han: 1 };

// 2翻役
export const SANSHOKU_DOUJUN: Yaku = { name: '三色同順', englishName: 'Sanshoku Doujun', han: 2 };
export const SANSHOKU_DOUKOU: Yaku = { name: '三色同刻', englishName: 'Sanshoku Doukou', han: 2 };
export const ITTSU: Yaku = { name: '一気通貫', englishName: 'Ittsu', han: 2 };
export const TOITOI: Yaku = { name: '対々和', englishName: 'Toitoi', han: 2 };
export const SANANKOU: Yaku = { name: '三暗刻', englishName: 'Sanankou', han: 2 };
export const SANKANTSU: Yaku = { name: '三槓子', englishName: 'Sankantsu', han: 2 };
export const HONROUTOU: Yaku = { name: '混老頭', englishName: 'Honroutou', han: 2 };
export const SHOUSANGEN: Yaku = { name: '小三元', englishName: 'Shousangen', han: 2 };
export const DOUBLE_RIICHI: Yaku = { name: 'ダブル立直', englishName: 'Double Riichi', han: 2, requiresClosed: true };
export const CHIITOITSU: Yaku = { name: '七対子', englishName: 'Chiitoitsu', han: 2, requiresClosed: true };

// 3翻役
export const HONITSU: Yaku = { name: '混一色', englishName: 'Honitsu', han: 3 };
export const JUNCHAN: Yaku = { name: '純全帯么九', englishName: 'Junchan', han: 3 };
export const RYANPEIKOU: Yaku = { name: '二盃口', englishName: 'Ryanpeikou', han: 3, requiresClosed: true };

// 6翻役
export const CHINITSU: Yaku = { name: '清一色', englishName: 'Chinitsu', han: 6 };

// 役満
export const KOKUSHI_MUSOU: Yaku = { name: '国士無双', englishName: 'Kokushi Musou', han: 13, isYakuman: true, requiresClosed: true };
export const SUUANKOU: Yaku = { name: '四暗刻', englishName: 'Suuankou', han: 13, isYakuman: true, requiresClosed: true };
export const DAISANGEN: Yaku = { name: '大三元', englishName: 'Daisangen', han: 13, isYakuman: true };
export const SHOUSUUSHI: Yaku = { name: '小四喜', englishName: 'Shousuushi', han: 13, isYakuman: true };
export const DAISUUSHI: Yaku = { name: '大四喜', englishName: 'Daisuushi', han: 26, isYakuman: true };
export const TSUUIISOU: Yaku = { name: '字一色', englishName: 'Tsuuiisou', han: 13, isYakuman: true };
export const CHINROUTOU: Yaku = { name: '清老頭', englishName: 'Chinroutou', han: 13, isYakuman: true };
export const RYUUIISOU: Yaku = { name: '緑一色', englishName: 'Ryuuiisou', han: 13, isYakuman: true };
export const SUUKANTSU: Yaku = { name: '四槓子', englishName: 'Suukantsu', han: 13, isYakuman: true };
export const CHURENPOUTOU: Yaku = { name: '九蓮宝燈', englishName: 'Chuuren Poutou', han: 13, isYakuman: true, requiresClosed: true };
export const TENHOU: Yaku = { name: '天和', englishName: 'Tenhou', han: 13, isYakuman: true, requiresClosed: true };
export const CHIIHOU: Yaku = { name: '地和', englishName: 'Chiihou', han: 13, isYakuman: true, requiresClosed: true };

export interface YakuResult {
  yaku: Yaku[];
  han: number;
  fu: number;
  isYakuman: boolean;
}