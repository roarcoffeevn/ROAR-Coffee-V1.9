import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Brain,
  Check,
  Coins,
  Copy,
  Disc3,
  Gamepad2,
  Gift,
  HelpCircle,
  LayoutGrid,
  Lock,
  PackageOpen,
  ScrollText,
  Share2,
  Smartphone,
  Sparkles,
  Sprout,
  Ticket,
  Trophy,
  X,
} from 'lucide-react';
import {
  buildCanonicalShareUrl,
  buildFacebookShareHref,
  buildInstagramCaption,
  canUseNativeShare,
  copyShareText,
} from '../lib/socialShare';
import { useI18n } from '../i18n/I18nContext';
import { useStore } from '../context/StoreContext';
import { fetchProductsWithFallback } from '../lib/staticFallback';
import type { Product } from '../context/StoreContext';
import {
  DEFAULT_GAME_CONFIGS,
  DEFAULT_GAME_REWARDS,
  type GameConfigRecord,
  type GameKey,
  type GameRewardClaimRecord,
  type GameRewardRecord,
} from '../lib/gamesCatalog';
import { MediaImage } from '../components/MediaImage';
import { LuckyWheelGame } from '../components/games/LuckyWheelGame';
import { ShakePhoneGame } from '../components/games/ShakePhoneGame';
import { FortuneStickGame } from '../components/games/FortuneStickGame';
import { PersonalityQuizGame } from '../components/games/PersonalityQuizGame';
import { MemoryMatchGame } from '../components/games/MemoryMatchGame';
import { HighlandHarvestGame } from '../components/games/HighlandHarvestGame';
import { MysteryBoxGame } from '../components/games/MysteryBoxGame';
import { BlockBlastGame } from '../components/games/BlockBlastGame';
import { DailyCheckinGame } from '../components/DailyCheckinGame';

interface RecentWinner {
  id: number;
  game_key: GameKey;
  display_name: string;
  reward_type: string;
  reward_label_vi: string;
  reward_label_en: string;
  gift_product_name_vi: string;
  gift_product_name_en: string;
  created_at: string;
}

export const PlayGamesPage: React.FC = () => {
  const { lang, t, localePath } = useI18n();
  const { user, apiFetch, refreshUser, showToast, addToCart, personalities } = useStore();
  const navigate = useNavigate();

  const [activeGame, setActiveGame] = useState<GameKey>('wheel');
  const [configs, setConfigs] = useState<GameConfigRecord[]>(DEFAULT_GAME_CONFIGS);
  const [rewards, setRewards] = useState<GameRewardRecord[]>(
    DEFAULT_GAME_REWARDS.map((r, idx) => ({ ...r, id: idx + 1 }))
  );
  const [remainingFreeToday, setRemainingFreeToday] = useState<Record<string, number>>({
    wheel: 1,
    blockblast: 2,
    shake: 2,
    fortune: 1,
    quiz: 1,
    memory: 1,
    harvest: 2,
    mystery: 1,
  });
  const [myClaims, setMyClaims] = useState<GameRewardClaimRecord[]>([]);
  const [recentWinners, setRecentWinners] = useState<RecentWinner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string>('');
  const [shareCopied, setShareCopied] = useState(false);
  const [resultModal, setResultModal] = useState<{
    isDemo: boolean;
    reward: GameRewardRecord;
    claimCode?: string;
    gameKey?: GameKey;
    score?: number;
  } | null>(null);

  const loadGamesData = useCallback(async () => {
    try {
      const res = await apiFetch('/api/games');
      if (res.ok) {
        const d = await res.json();
        if (Array.isArray(d.configs) && d.configs.length > 0) setConfigs(d.configs);
        if (Array.isArray(d.rewards) && d.rewards.length > 0) setRewards(d.rewards);
        if (d.remainingFreeToday) setRemainingFreeToday(d.remainingFreeToday);
        if (Array.isArray(d.myClaims)) setMyClaims(d.myClaims);
        if (Array.isArray(d.recentWinners)) setRecentWinners(d.recentWinners);
      }
    } catch {
      // ignore fallback already loaded
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadGamesData();
  }, [loadGamesData, user?.id]);

  useEffect(() => {
    fetchProductsWithFallback().then((list) => setProducts(list || [])).catch(() => {});
  }, []);

  const gameMetaList: Array<{ key: GameKey; icon: React.ReactNode; shortVi: string; shortEn: string }> = [
    { key: 'wheel', icon: <Disc3 className="w-4 h-4" />, shortVi: 'Vòng Quay', shortEn: 'Lucky Wheel' },
    { key: 'blockblast', icon: <LayoutGrid className="w-4 h-4" />, shortVi: 'Block Blast', shortEn: 'Block Blast' },
    { key: 'shake', icon: <Smartphone className="w-4 h-4" />, shortVi: 'Lắc Điện Thoại', shortEn: 'Shake & Win' },
    { key: 'fortune', icon: <ScrollText className="w-4 h-4" />, shortVi: 'Xin Xăm Cà Phê', shortEn: 'Fortune Stick' },
    { key: 'quiz', icon: <HelpCircle className="w-4 h-4" />, shortVi: 'Gu 7 Cá Tính', shortEn: 'Taste Quiz' },
    { key: 'memory', icon: <Brain className="w-4 h-4" />, shortVi: 'Lật Thẻ', shortEn: 'Memory Match' },
    { key: 'harvest', icon: <Sprout className="w-4 h-4" />, shortVi: 'Hứng Hạt', shortEn: 'Harvest' },
    { key: 'mystery', icon: <PackageOpen className="w-4 h-4" />, shortVi: 'Hộp Bí Ẩn', shortEn: 'Mystery Box' },
  ];

  const currentConfig = configs.find((c) => c.game_key === activeGame) || DEFAULT_GAME_CONFIGS[0];
  const currentRewards = useMemo(
    () => rewards.filter((r) => r.game_key === activeGame).sort((a, b) => a.slot_order - b.slot_order || a.id - b.id),
    [rewards, activeGame]
  );

  const activeWeightSum = useMemo(
    () =>
      currentRewards
        .filter((r) => r.active && (r.stock_total < 0 || r.stock_remaining > 0))
        .reduce((acc, r) => acc + Math.max(1, Number(r.weight || 1)), 0),
    [currentRewards]
  );

  const handlePlayReal = async (gameKey: GameKey, useExtraPoints: boolean, score = 0) => {
    const res = await apiFetch('/api/games/play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameKey, useExtraPoints, score }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(d.error || t('Không thể thực hiện lượt chơi.', 'Could not complete play.'));
      return null;
    }

    await Promise.all([loadGamesData(), refreshUser()]);

    if (d.won && d.reward) {
      const code = d.promoCode || d.claim?.claim_code || '';
      const resolvedScore = Number(d.score ?? score ?? 0);
      const delayMs = gameKey === 'wheel' ? 4200 : gameKey === 'fortune' ? 1600 : 250;
      window.setTimeout(() => {
        setShareCopied(false);
        setResultModal({
          isDemo: false,
          reward: d.reward,
          claimCode: code,
          gameKey,
          score: resolvedScore > 0 ? resolvedScore : undefined,
        });
      }, delayMs);
    } else if (!d.won) {
      showToast(
        t(
          `Bạn đạt ${d.score} điểm (cần ${d.minScoreRequired} điểm để nhận quà). Thử lại nhé!`,
          `You scored ${d.score} pts (${d.minScoreRequired} needed to win). Try again!`
        )
      );
    }
    return d;
  };

  const handleDemoResult = (reward: GameRewardRecord) => {
    setShareCopied(false);
    setResultModal({
      isDemo: true,
      reward,
      gameKey: activeGame,
    });
  };

  const handleCopyCode = (code: string) => {
    if (!code) return;
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopiedCode(code);
    showToast(t(`Đã sao chép mã: ${code}`, `Copied code: ${code}`));
    window.setTimeout(() => setCopiedCode(''), 2000);
  };

  const handleApplyToCheckout = (code: string) => {
    if (code && typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem('roar_pending_promo', code);
    }
    navigate(localePath('/checkout'));
  };

  const handleAddMatchedProduct = (product: Product) => {
    const firstVar = product.variants?.[0];
    addToCart({
      productId: product.id,
      slug: product.slug,
      sku: product.sku,
      nameVi: product.name_vi,
      nameEn: product.name_en,
      variantLabel: firstVar?.label || product.moq || '250g',
      unitPriceVnd: firstVar?.priceVnd || product.price_vnd,
      unitPriceUsd: firstVar?.priceUsd || product.price_usd,
      quantity: 1,
      imageKey: product.image_key,
      unit: (product.pricing_tiers?.length || 0) > 0 ? 'kg' : 'unit',
      pricingTiers: product.pricing_tiers,
    });
    showToast(t(`Đã thêm ${product.name_vi} vào giỏ hàng`, `Added ${product.name_en} to cart`));
  };

  const userAvailablePts = user?.points?.available ?? 0;

  return (
    <div className="min-h-screen overflow-x-clip bg-[#F8F5EF] dark:bg-[#0E1512] text-[#202020] dark:text-[#F1EFEA] pb-24 lg:pb-20">
      {/* Compact Editorial Hero Header (tight mobile viewport fit, full editorial on sm+/lg+) */}
      <section className="bg-[#003D25] text-[#F8F5EF] border-b border-[#C6A667]/25">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 lg:py-10">
          <div className="flex items-center justify-between gap-3 lg:gap-6">
            <div className="space-y-1 sm:space-y-2 max-w-2xl min-w-0">
              <div className="hidden sm:inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#C6A667]">
                <Gamepad2 className="w-4 h-4" />
                <span>{t('ROAR PLAY & WIN · SÂN CHƠI THƯỞNG CÀ PHÊ THẬT', 'ROAR PLAY & WIN · COFFEE REWARDS ARENA')}</span>
              </div>
              <div className="sm:hidden inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#C6A667]">
                <Gamepad2 className="w-3.5 h-3.5 shrink-0" />
                <span>ROAR PLAY &amp; WIN</span>
              </div>
              <h1 className="font-serif text-lg sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight truncate sm:whitespace-normal">
                {t('Chơi Vui Trúng Quà Cà Phê & Voucher', 'Play & Win ROAR Coffee Gifts')}
              </h1>
              <p className="hidden sm:block text-sm text-[#F8F5EF]/80 leading-relaxed">
                {t(
                  'Tham gia 8 mini-game tương tác mỗi ngày (Vòng Quay, Block Blast, Lắc Điện Thoại, Xin Xăm Cà Phê, Đoán Gu, Lật Thẻ, Hứng Hạt, Hộp Bí Ẩn) để tích điểm ROAR CLUB, săn voucher và rinh ngay túi cà phê tặng kèm miễn phí.',
                  'Play 8 daily interactive coffee games (Lucky Wheel, Block Blast, Shake & Win, Fortune Stick, Taste Quiz, Memory, Harvest & Mystery Box) to earn ROAR CLUB points, vouchers, and complimentary coffee gifts.'
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {user ? (
                <div className="px-2.5 py-1.5 sm:px-4 sm:py-3 rounded-xl bg-white/10 border border-[#C6A667]/35 flex items-center gap-2 sm:gap-3">
                  <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-[#C6A667] shrink-0" />
                  <div>
                    <div className="hidden sm:block text-[11px] uppercase tracking-wider text-white/70">
                      {t('Điểm khả dụng', 'Available Points')}
                    </div>
                    <div className="font-mono text-xs sm:text-lg font-extrabold text-[#C6A667] tabular-nums whitespace-nowrap">
                      {userAvailablePts.toLocaleString()} {t('điểm', 'pts')}
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  to={localePath('/account')}
                  className="px-3 py-2 sm:px-5 sm:py-3 rounded-xl bg-[#C6A667] hover:bg-[#b59454] text-[#111111] text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 sm:gap-2 shadow-md whitespace-nowrap shrink-0"
                >
                  <Gift className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="sm:hidden">{t('Đăng nhập', 'Sign In')}</span>
                  <span className="hidden sm:inline">{t('Đăng nhập để Lưu & Nhận Quà', 'Sign In to Claim Prizes')}</span>
                </Link>
              )}
            </div>
          </div>

          {/* 7-Game Switcher Tabs */}
          <div className="mt-2.5 sm:mt-6 -mx-3 px-3 sm:mx-0 sm:px-0 flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1">
            {gameMetaList.map((g) => {
              const cfg = configs.find((c) => c.game_key === g.key);
              const isSelected = activeGame === g.key;
              const freeLeft = remainingFreeToday[g.key] ?? 0;
              return (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setActiveGame(g.key)}
                  className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap shrink-0 cursor-pointer border min-h-[38px] sm:min-h-[42px] ${
                    isSelected
                      ? 'bg-[#C6A667] text-[#111111] border-[#C6A667] shadow-md'
                      : 'bg-white/10 text-white/90 border-white/15 hover:bg-white/15'
                  }`}
                >
                  {g.icon}
                  <span>{lang === 'en' ? g.shortEn : g.shortVi}</span>
                  {user && cfg?.active !== 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold tabular-nums ${
                        isSelected ? 'bg-[#111111]/15 text-[#111111]' : 'bg-black/25 text-[#C6A667]'
                      }`}
                    >
                      {freeLeft}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Play Arena + Live Prize Pool & Wallet */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-3 sm:mt-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] gap-4 sm:gap-7 items-start">
        {/* Left Column: Active Game Arena + Daily Check-in */}
        <div className="space-y-4 sm:space-y-6 min-w-0 w-full">
          <div className="rounded-2xl bg-white dark:bg-[#16221C] border border-[#202020]/10 dark:border-white/10 p-3 sm:p-7 shadow-sm w-full min-w-0 overflow-hidden">
            <div className="mb-3 pb-2.5 sm:mb-5 sm:pb-4 border-b border-[#202020]/10 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 min-w-0">
              <div className="min-w-0 w-full">
                <h2 className="font-serif text-base sm:text-2xl font-bold text-[#111111] dark:text-[#F8F5EF] leading-tight break-words">
                  {lang === 'en' ? currentConfig.title_en : currentConfig.title_vi}
                </h2>
                <p className="text-[11px] sm:text-xs text-[#202020]/70 dark:text-[#F1EFEA]/70 mt-0.5 sm:mt-1 line-clamp-2 sm:line-clamp-none break-words">
                  {lang === 'en' ? currentConfig.subtitle_en : currentConfig.subtitle_vi}
                </p>
              </div>
              {currentConfig.active === 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-bold whitespace-nowrap self-start sm:self-auto">
                  <Lock className="w-3.5 h-3.5" />
                  <span>{t('Đang tạm bảo trì', 'Maintenance')}</span>
                </span>
              )}
            </div>

            {currentConfig.active === 0 ? (
              <div className="py-12 text-center text-sm text-[#202020]/70 dark:text-[#F1EFEA]/70">
                {t(
                  'Trò chơi này đang được cập nhật phần thưởng mới từ Admin. Vui lòng thử các trò chơi khác nhé!',
                  'This mini-game is currently being updated with fresh rewards. Please try another game!'
                )}
              </div>
            ) : activeGame === 'wheel' ? (
              <LuckyWheelGame
                lang={lang}
                config={currentConfig}
                rewards={currentRewards}
                remainingFreeToday={remainingFreeToday.wheel ?? 0}
                isSignedIn={Boolean(user)}
                userPoints={userAvailablePts}
                onPlayReal={(useExtra) => handlePlayReal('wheel', useExtra)}
                onRequireLogin={() => navigate(localePath('/account'))}
                onDemoResult={handleDemoResult}
              />
            ) : activeGame === 'shake' ? (
              <ShakePhoneGame
                lang={lang}
                config={currentConfig}
                rewards={currentRewards}
                remainingFreeToday={remainingFreeToday.shake ?? 0}
                isSignedIn={Boolean(user)}
                userPoints={userAvailablePts}
                onPlayReal={(useExtra) => handlePlayReal('shake', useExtra)}
                onRequireLogin={() => navigate(localePath('/account'))}
                onDemoResult={handleDemoResult}
              />
            ) : activeGame === 'fortune' ? (
              <FortuneStickGame
                lang={lang}
                config={currentConfig}
                rewards={currentRewards}
                products={products}
                remainingFreeToday={remainingFreeToday.fortune ?? 0}
                isSignedIn={Boolean(user)}
                userPoints={userAvailablePts}
                onPlayReal={(useExtra) => handlePlayReal('fortune', useExtra)}
                onAddProductToCart={handleAddMatchedProduct}
                onRequireLogin={() => navigate(localePath('/account'))}
                onDemoResult={handleDemoResult}
              />
            ) : activeGame === 'quiz' ? (
              <PersonalityQuizGame
                lang={lang}
                config={currentConfig}
                rewards={currentRewards}
                personalities={personalities}
                products={products}
                remainingFreeToday={remainingFreeToday.quiz ?? 0}
                isSignedIn={Boolean(user)}
                userPoints={userAvailablePts}
                onAddProductToCart={handleAddMatchedProduct}
                onPlayReal={(useExtra) => handlePlayReal('quiz', useExtra)}
                onRequireLogin={() => navigate(localePath('/account'))}
                onDemoResult={handleDemoResult}
              />
            ) : activeGame === 'memory' ? (
              <MemoryMatchGame
                lang={lang}
                config={currentConfig}
                rewards={currentRewards}
                remainingFreeToday={remainingFreeToday.memory ?? 0}
                isSignedIn={Boolean(user)}
                userPoints={userAvailablePts}
                onPlayReal={(useExtra) => handlePlayReal('memory', useExtra)}
                onRequireLogin={() => navigate(localePath('/account'))}
                onDemoResult={handleDemoResult}
              />
            ) : activeGame === 'harvest' ? (
              <HighlandHarvestGame
                lang={lang}
                config={currentConfig}
                rewards={currentRewards}
                remainingFreeToday={remainingFreeToday.harvest ?? 0}
                isSignedIn={Boolean(user)}
                userPoints={userAvailablePts}
                onPlayReal={(useExtra, score) => handlePlayReal('harvest', useExtra, score)}
                onRequireLogin={() => navigate(localePath('/account'))}
                onDemoResult={handleDemoResult}
              />
            ) : activeGame === 'blockblast' ? (
              <BlockBlastGame
                lang={lang}
                config={currentConfig}
                rewards={currentRewards}
                remainingFreeToday={remainingFreeToday.blockblast ?? 0}
                isSignedIn={Boolean(user)}
                userPoints={userAvailablePts}
                onPlayReal={(useExtra, score) => handlePlayReal('blockblast', useExtra, score)}
                onRequireLogin={() => navigate(localePath('/account'))}
                onDemoResult={handleDemoResult}
              />
            ) : (
              <MysteryBoxGame
                lang={lang}
                config={currentConfig}
                rewards={currentRewards}
                remainingFreeToday={remainingFreeToday.mystery ?? 0}
                isSignedIn={Boolean(user)}
                userPoints={userAvailablePts}
                onPlayReal={(useExtra) => handlePlayReal('mystery', useExtra)}
                onRequireLogin={() => navigate(localePath('/account'))}
                onDemoResult={handleDemoResult}
              />
            )}
          </div>

          {/* Integrated 7-Day Daily Check-in Widget */}
          {user && <DailyCheckinGame onRewardClaimed={() => loadGamesData()} />}
        </div>

        {/* Right Column: Live Prize Pool, My Claims Bag & Recent Winners */}
        <aside className="space-y-4 sm:space-y-6 min-w-0 w-full">
          {/* Active Game Prize Pool */}
          <div className="rounded-2xl bg-white dark:bg-[#16221C] border border-[#202020]/10 dark:border-white/10 p-4 sm:p-5 shadow-sm space-y-4 w-full min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#00552B] dark:text-[#C6A667]">
                <Trophy className="w-4 h-4" />
                <span>{t('Cơ Cấu Phần Thưởng Hiện Tại', 'Live Prize Pool')}</span>
              </div>
              <span className="text-[11px] font-semibold text-[#202020]/60 dark:text-[#F1EFEA]/60 tabular-nums">
                {currentRewards.filter((r) => r.active).length} {t('phần quà', 'slots')}
              </span>
            </div>

            {loading ? (
              <div className="text-xs text-[#202020]/60 dark:text-[#F1EFEA]/60 py-4">{t('Đang tải kho quà...', 'Loading prizes...')}</div>
            ) : (
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {currentRewards
                  .filter((r) => r.active)
                  .map((r) => {
                    const outOfStock = r.stock_total >= 0 && r.stock_remaining <= 0;
                    const chancePct =
                      !outOfStock && activeWeightSum > 0
                        ? Math.max(1, Math.round((Math.max(1, r.weight) / activeWeightSum) * 100))
                        : 0;
                    return (
                      <div
                        key={r.id}
                        className={`p-3 rounded-xl border flex items-center gap-3 ${
                          outOfStock
                            ? 'opacity-50 bg-black/5 dark:bg-white/5 border-transparent'
                            : 'bg-[#F8F5EF]/70 dark:bg-[#0E1512]/80 border-[#202020]/10 dark:border-white/10'
                        }`}
                      >
                        <div className="w-11 h-11 rounded-lg overflow-hidden bg-white dark:bg-[#16221C] border border-[#202020]/10 shrink-0 flex items-center justify-center">
                          {r.reward_type === 'product_gift' && r.gift_image_key ? (
                            <MediaImage imageKey={r.gift_image_key} alt={r.label_vi} className="w-full h-full object-cover" />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center text-white text-[10px] font-extrabold"
                              style={{ backgroundColor: r.color_hex || '#00552B' }}
                            >
                              {lang === 'en' ? r.badge_en || 'PRIZE' : r.badge_vi || 'QUÀ'}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-[#111111] dark:text-[#F8F5EF] truncate">
                            {lang === 'en' ? r.label_en : r.label_vi}
                          </div>
                          <div className="text-[11px] text-[#202020]/65 dark:text-[#F1EFEA]/65 truncate">
                            {r.reward_type === 'product_gift'
                              ? lang === 'en'
                                ? r.gift_product_name_en || r.description_en
                                : r.gift_product_name_vi || r.description_vi
                              : lang === 'en'
                                ? r.description_en
                                : r.description_vi}
                          </div>
                        </div>
                        <div className="text-right shrink-0 tabular-nums">
                          <div className="text-[11px] font-extrabold text-[#00552B] dark:text-[#C6A667]">
                            {outOfStock ? t('Hết', 'Sold out') : `~${chancePct}%`}
                          </div>
                          {r.stock_total >= 0 && (
                            <div className="text-[10px] text-[#202020]/55 dark:text-[#F1EFEA]/55">
                              {r.stock_remaining}/{r.stock_total}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* My Won Rewards & Physical Gifts Bag */}
          <div className="rounded-2xl bg-white dark:bg-[#16221C] border border-[#C6A667]/35 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#8C6D32] dark:text-[#C6A667]">
                <Ticket className="w-4 h-4" />
                <span>{t('Túi Quà & Mã Thưởng Của Tôi', 'My Won Gifts & Vouchers')}</span>
              </div>
              {user && (
                <span className="text-xs font-bold text-[#00552B] dark:text-[#C6A667] tabular-nums">
                  {myClaims.length}
                </span>
              )}
            </div>

            {!user ? (
              <div className="p-4 rounded-xl bg-[#F8F5EF] dark:bg-[#0E1512] text-center space-y-3">
                <p className="text-xs text-[#202020]/75 dark:text-[#F1EFEA]/75">
                  {t(
                    'Đăng nhập tài khoản thành viên ROAR CLUB để lưu tự động mọi mã giảm giá, điểm thưởng và sản phẩm trúng từ mini-game.',
                    'Sign in to your ROAR CLUB account to store all won coffee gifts, points, and single-use vouchers.'
                  )}
                </p>
                <Link
                  to={localePath('/account')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00552B] text-white text-xs font-bold"
                >
                  <span>{t('Đăng nhập ngay', 'Sign In Now')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : myClaims.length === 0 ? (
              <p className="text-xs text-[#202020]/65 dark:text-[#F1EFEA]/65 py-3 text-center">
                {t('Bạn chưa có phần thưởng mini-game nào. Hãy quay Vòng Quay hoặc chơi ngay bên trái!', 'No game rewards yet. Play any game on the left to win!')}
              </p>
            ) : (
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {myClaims.map((cl) => {
                  const isRedeemable =
                    cl.status === 'active' &&
                    (cl.reward_type === 'product_gift' ||
                      cl.reward_type === 'voucher_percent' ||
                      cl.reward_type === 'voucher_fixed' ||
                      cl.reward_type === 'free_shipping');
                  const codeToUse = cl.promo_code || cl.claim_code;
                  return (
                    <div
                      key={cl.id}
                      className="p-3 rounded-xl border border-[#202020]/10 dark:border-white/10 bg-[#F8F5EF]/75 dark:bg-[#0E1512]/80 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#111111] dark:text-[#F8F5EF]">
                            {lang === 'en' ? cl.reward_label_en : cl.reward_label_vi}
                          </div>
                          {cl.reward_type === 'product_gift' && (cl.gift_product_name_vi || cl.gift_product_name_en) && (
                            <div className="text-[11px] font-semibold text-[#00552B] dark:text-[#C6A667]">
                              🎁 {lang === 'en' ? cl.gift_product_name_en : cl.gift_product_name_vi}
                            </div>
                          )}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase whitespace-nowrap ${
                            cl.status === 'active'
                              ? 'bg-[#00552B]/15 text-[#00552B] dark:text-[#C6A667]'
                              : cl.status === 'fulfilled'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                : 'bg-black/10 dark:bg-white/10 text-[#202020]/60 dark:text-white/60'
                          }`}
                        >
                          {cl.status === 'active'
                            ? t('Sẵn sàng dùng', 'Ready')
                            : cl.status === 'redeemed'
                              ? t('Đã gắn đơn', 'In Order')
                              : cl.status === 'fulfilled'
                                ? t('Đã nhận', 'Credited')
                                : cl.status}
                        </span>
                      </div>

                      {cl.reward_type !== 'points' && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 min-w-0">
                          <code className="px-2 py-1 rounded bg-white dark:bg-[#16221C] border border-[#202020]/10 dark:border-white/10 font-mono text-[11px] font-bold text-[#111111] dark:text-[#C6A667] break-all">
                            {codeToUse}
                          </code>
                          {isRedeemable && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleCopyCode(codeToUse)}
                                className="px-2.5 py-1 rounded-lg border border-[#202020]/15 dark:border-white/15 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                              >
                                {copiedCode === codeToUse ? <Check className="w-3 h-3 text-[#00552B]" /> : <Copy className="w-3 h-3" />}
                                <span>{t('Copy', 'Copy')}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApplyToCheckout(codeToUse)}
                                className="px-2.5 py-1 rounded-lg bg-[#00552B] hover:bg-[#003D25] text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <span>{t('Dùng ngay', 'Apply')}</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Anonymized Recent Winners */}
          {recentWinners.length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-[#16221C] border border-[#202020]/10 dark:border-white/10 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#00552B] dark:text-[#C6A667]">
                <Award className="w-4 h-4" />
                <span>{t('Bảng Vàng Trúng Thưởng Gần Đây', 'Recent Member Wins')}</span>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {recentWinners.map((w) => (
                  <div
                    key={w.id}
                    className="text-xs flex items-center justify-between gap-2 py-1.5 border-b border-[#202020]/5 dark:border-white/5 last:border-none"
                  >
                    <span className="font-semibold text-[#111111] dark:text-[#F8F5EF] truncate">
                      {w.display_name}
                    </span>
                    <span className="text-[#00552B] dark:text-[#C6A667] font-bold truncate max-w-[180px]">
                      {lang === 'en' ? w.reward_label_en : w.reward_label_vi}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Win Result Celebration Modal */}
      {resultModal && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-[#16221C] border border-[#C6A667]/50 rounded-2xl max-w-md w-full max-h-[90svh] overflow-y-auto p-4 sm:p-6 shadow-2xl space-y-3.5 sm:space-y-5 relative">
            <button
              type="button"
              onClick={() => setResultModal(null)}
              className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2 sm:space-y-3">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-[#00552B] text-[#C6A667] flex items-center justify-center mx-auto shadow-lg">
                {resultModal.reward.reward_type === 'product_gift' ? (
                  <Gift className="w-6 h-6 sm:w-8 sm:h-8" />
                ) : (
                  <Sparkles className="w-6 h-6 sm:w-8 sm:h-8" />
                )}
              </div>
              <div className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#8C6D32] dark:text-[#C6A667]">
                {resultModal.isDemo
                  ? t('KẾT QUẢ CHƠI THỬ (DEMO)', 'DEMO RESULT PREVIEW')
                  : t('CHÚC MỪNG BẠN ĐÃ TRÚNG THƯỞNG', 'CONGRATULATIONS! YOU WON')}
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#111111] dark:text-[#F8F5EF]">
                {lang === 'en' ? resultModal.reward.label_en : resultModal.reward.label_vi}
              </h3>
              <p className="text-xs text-[#202020]/75 dark:text-[#F1EFEA]/75 leading-relaxed">
                {lang === 'en' ? resultModal.reward.description_en : resultModal.reward.description_vi}
              </p>

              {resultModal.reward.reward_type === 'product_gift' && resultModal.reward.gift_image_key && (
                <div className="p-3 rounded-xl bg-[#F8F5EF] dark:bg-[#0E1512] border border-[#C6A667]/30 flex items-center gap-3 text-left">
                  <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-white">
                    <MediaImage
                      imageKey={resultModal.reward.gift_image_key}
                      alt={resultModal.reward.gift_product_name_vi || resultModal.reward.label_vi}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#111111] dark:text-[#F8F5EF]">
                      {lang === 'en' ? resultModal.reward.gift_product_name_en : resultModal.reward.gift_product_name_vi}
                    </div>
                    <div className="text-[11px] text-[#00552B] dark:text-[#C6A667]">
                      {resultModal.reward.gift_product_variant || t('Quà tặng miễn phí kèm đơn', 'Complimentary gift with order')}
                    </div>
                  </div>
                </div>
              )}

              {resultModal.score && resultModal.score > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#00552B]/10 dark:bg-[#C6A667]/15 text-[#00552B] dark:text-[#C6A667] text-xs font-bold tabular-nums">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>
                    {t(`Thành tích: ${resultModal.score} điểm`, `Score: ${resultModal.score} pts`)}
                  </span>
                </div>
              )}

              {!resultModal.isDemo && resultModal.claimCode && resultModal.reward.reward_type !== 'points' && (
                <div className="p-3 rounded-xl bg-[#F8F5EF] dark:bg-[#0E1512] border border-dashed border-[#00552B]/40 dark:border-[#C6A667]/40 space-y-2">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-[#202020]/60 dark:text-[#F1EFEA]/60">
                    {t('Mã Quà Tặng / Voucher Của Bạn', 'Your Reward Code')}
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <code className="font-mono text-base font-extrabold text-[#00552B] dark:text-[#C6A667]">
                      {resultModal.claimCode}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(resultModal.claimCode!)}
                      className="p-1.5 rounded-lg bg-white dark:bg-[#16221C] border border-[#202020]/10 cursor-pointer"
                      aria-label="Copy"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {(() => {
              const matchedGameMeta = gameMetaList.find((g) => g.key === (resultModal.gameKey || activeGame));
              const gameTitle = matchedGameMeta
                ? lang === 'en'
                  ? matchedGameMeta.shortEn
                  : matchedGameMeta.shortVi
                : 'ROAR COFFEE Play & Win';
              const rewardLabel = lang === 'en' ? resultModal.reward.label_en : resultModal.reward.label_vi;
              const scoreSnippet =
                resultModal.score && resultModal.score > 0
                  ? lang === 'en'
                    ? ` (Score: ${resultModal.score} pts)`
                    : ` (Đạt ${resultModal.score} điểm)`
                  : '';
              const shareUrl = buildCanonicalShareUrl(localePath('/play'));
              const shareText =
                lang === 'en'
                  ? `I just played ${gameTitle} at ROAR COFFEE®${scoreSnippet} and won: ${rewardLabel}! Try your luck today.`
                  : `Mình vừa chơi ${gameTitle} tại ROAR COFFEE®${scoreSnippet} và trúng: ${rewardLabel}! Vào thử vận may ngay nhé.`;
              const sharePayload = {
                url: shareUrl,
                title: `ROAR COFFEE® — ${gameTitle}`,
                text: shareText,
                hashtags: ['ROARCOFFEE', 'RoarPlayAndWin', 'CaPheVietNam'],
              };
              const fbHref = buildFacebookShareHref(sharePayload);
              const igCaption = buildInstagramCaption(sharePayload);

              return (
                <div className="pt-3 border-t border-[#202020]/10 dark:border-white/10 space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-center text-[#202020]/60 dark:text-[#F1EFEA]/60">
                    {t('Khoe chiến tích & nhận lộc cùng bạn bè', 'Share your score & winnings')}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <a
                      href={fbHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-[#1877F2]/30 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] dark:text-[#60A5FA] text-xs font-bold whitespace-nowrap shrink-0 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 4v2.2H8v3h2.5V21h3z" />
                      </svg>
                      <span>Facebook</span>
                    </a>

                    <a
                      href="https://www.instagram.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={async () => {
                        await copyShareText(igCaption);
                        setShareCopied(true);
                        showToast(
                          t(
                            'Đã sao chép kết quả & hashtag! Dán lên Instagram Story hoặc bài viết nhé.',
                            'Result caption & hashtags copied! Paste into your Instagram post or Story.'
                          )
                        );
                        window.setTimeout(() => setShareCopied(false), 2500);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-[#E1306C]/30 bg-[#E1306C]/10 hover:bg-[#E1306C]/20 text-[#C13584] dark:text-[#F472B6] text-xs font-bold whitespace-nowrap shrink-0 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5 shrink-0 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="3" y="3" width="18" height="18" rx="5" />
                        <circle cx="12" cy="12" r="4" />
                        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                      </svg>
                      <span>Instagram</span>
                    </a>

                    <button
                      type="button"
                      onClick={async () => {
                        if (canUseNativeShare()) {
                          try {
                            await navigator.share({
                              title: sharePayload.title,
                              text: sharePayload.text,
                              url: sharePayload.url,
                            });
                            return;
                          } catch {
                            // User cancelled or unsupported fallback to clipboard
                          }
                        }
                        await copyShareText(`${shareText}\n${shareUrl}`);
                        setShareCopied(true);
                        showToast(t('Đã sao chép kết quả & liên kết!', 'Copied result & link!'));
                        window.setTimeout(() => setShareCopied(false), 2500);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-[#202020]/15 dark:border-white/15 bg-[#F8F5EF] dark:bg-[#0E1512] hover:border-[#00552B] dark:hover:border-[#C6A667] text-[#202020] dark:text-[#F1EFEA] text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                    >
                      {shareCopied ? (
                        <Check className="w-3.5 h-3.5 text-[#00552B] dark:text-[#C6A667] shrink-0" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>{shareCopied ? t('Đã chép', 'Copied') : t('Chia sẻ', 'Share')}</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              {resultModal.isDemo ? (
                <button
                  type="button"
                  onClick={() => {
                    setResultModal(null);
                    navigate(localePath('/account'));
                  }}
                  className="w-full py-3 rounded-xl bg-[#00552B] hover:bg-[#003D25] text-white text-sm font-bold cursor-pointer"
                >
                  {t('Đăng nhập ngay để Nhận Quà Thật →', 'Sign In to Claim Real Rewards →')}
                </button>
              ) : resultModal.claimCode && resultModal.reward.reward_type !== 'points' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleApplyToCheckout(resultModal.claimCode!)}
                    className="flex-1 py-3 px-4 rounded-xl bg-[#00552B] hover:bg-[#003D25] text-white text-sm font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>{t('Áp dụng vào Thanh toán', 'Apply at Checkout')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setResultModal(null)}
                    className="py-3 px-4 rounded-xl border border-[#202020]/15 dark:border-white/15 text-sm font-bold cursor-pointer"
                  >
                    {t('Chơi tiếp', 'Keep Playing')}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setResultModal(null)}
                  className="w-full py-3 rounded-xl bg-[#00552B] hover:bg-[#003D25] text-white text-sm font-bold cursor-pointer"
                >
                  {t('Tuyệt vời! Chơi tiếp', 'Awesome! Continue')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
