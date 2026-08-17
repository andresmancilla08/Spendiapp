/**
 * Catálogo de iconos de categoría — Tabler, curado por familias.
 *
 * El valor que se guarda en `Category.icon` es la CLAVE de este catálogo
 * ('pizza', 'gas-station'…), no un emoji. Las categorías creadas antes de esto
 * guardaron emoji: `EMOJI_TO_ICON` las traduce (ver `hooks/useCategories`), y
 * `components/CategoryIcon` sigue pintando cualquier emoji que sobreviva.
 *
 * Reglas:
 * - Set curado, no los ~6.200 de Tabler: el picker tiene que ser navegable y
 *   cada icono importado pesa en el bundle.
 * - Toda clave nueva necesita sus keywords en KEYWORD_ICONS, o la IA no la elegirá.
 */
import IconToolsKitchen2 from '@tabler/icons-react-native/dist/esm/icons/IconToolsKitchen2.mjs';
import IconPizza from '@tabler/icons-react-native/dist/esm/icons/IconPizza.mjs';
import IconBurger from '@tabler/icons-react-native/dist/esm/icons/IconBurger.mjs';
import IconMeat from '@tabler/icons-react-native/dist/esm/icons/IconMeat.mjs';
import IconFish from '@tabler/icons-react-native/dist/esm/icons/IconFish.mjs';
import IconSalad from '@tabler/icons-react-native/dist/esm/icons/IconSalad.mjs';
import IconSoup from '@tabler/icons-react-native/dist/esm/icons/IconSoup.mjs';
import IconBread from '@tabler/icons-react-native/dist/esm/icons/IconBread.mjs';
import IconCheese from '@tabler/icons-react-native/dist/esm/icons/IconCheese.mjs';
import IconIceCream2 from '@tabler/icons-react-native/dist/esm/icons/IconIceCream2.mjs';
import IconCake from '@tabler/icons-react-native/dist/esm/icons/IconCake.mjs';
import IconCandy from '@tabler/icons-react-native/dist/esm/icons/IconCandy.mjs';
import IconCookie from '@tabler/icons-react-native/dist/esm/icons/IconCookie.mjs';
import IconCoffee from '@tabler/icons-react-native/dist/esm/icons/IconCoffee.mjs';
import IconCup from '@tabler/icons-react-native/dist/esm/icons/IconCup.mjs';
import IconBeer from '@tabler/icons-react-native/dist/esm/icons/IconBeer.mjs';
import IconGlassFull from '@tabler/icons-react-native/dist/esm/icons/IconGlassFull.mjs';
import IconBottle from '@tabler/icons-react-native/dist/esm/icons/IconBottle.mjs';
import IconMilk from '@tabler/icons-react-native/dist/esm/icons/IconMilk.mjs';
import IconEgg from '@tabler/icons-react-native/dist/esm/icons/IconEgg.mjs';
import IconCarrot from '@tabler/icons-react-native/dist/esm/icons/IconCarrot.mjs';
import IconApple from '@tabler/icons-react-native/dist/esm/icons/IconApple.mjs';
import IconLemon from '@tabler/icons-react-native/dist/esm/icons/IconLemon.mjs';
import IconChefHat from '@tabler/icons-react-native/dist/esm/icons/IconChefHat.mjs';
import IconGrillFork from '@tabler/icons-react-native/dist/esm/icons/IconGrillFork.mjs';
import IconBowl from '@tabler/icons-react-native/dist/esm/icons/IconBowl.mjs';
import IconShoppingCart from '@tabler/icons-react-native/dist/esm/icons/IconShoppingCart.mjs';
import IconBasket from '@tabler/icons-react-native/dist/esm/icons/IconBasket.mjs';
import IconCar from '@tabler/icons-react-native/dist/esm/icons/IconCar.mjs';
import IconCarSuv from '@tabler/icons-react-native/dist/esm/icons/IconCarSuv.mjs';
import IconBus from '@tabler/icons-react-native/dist/esm/icons/IconBus.mjs';
import IconTrain from '@tabler/icons-react-native/dist/esm/icons/IconTrain.mjs';
import IconPlane from '@tabler/icons-react-native/dist/esm/icons/IconPlane.mjs';
import IconBike from '@tabler/icons-react-native/dist/esm/icons/IconBike.mjs';
import IconMotorbike from '@tabler/icons-react-native/dist/esm/icons/IconMotorbike.mjs';
import IconScooter from '@tabler/icons-react-native/dist/esm/icons/IconScooter.mjs';
import IconGasStation from '@tabler/icons-react-native/dist/esm/icons/IconGasStation.mjs';
import IconParking from '@tabler/icons-react-native/dist/esm/icons/IconParking.mjs';
import IconRoad from '@tabler/icons-react-native/dist/esm/icons/IconRoad.mjs';
import IconShip from '@tabler/icons-react-native/dist/esm/icons/IconShip.mjs';
import IconHelicopter from '@tabler/icons-react-native/dist/esm/icons/IconHelicopter.mjs';
import IconWalk from '@tabler/icons-react-native/dist/esm/icons/IconWalk.mjs';
import IconSteeringWheel from '@tabler/icons-react-native/dist/esm/icons/IconSteeringWheel.mjs';
import IconTir from '@tabler/icons-react-native/dist/esm/icons/IconTir.mjs';
import IconTrafficLights from '@tabler/icons-react-native/dist/esm/icons/IconTrafficLights.mjs';
import IconMap2 from '@tabler/icons-react-native/dist/esm/icons/IconMap2.mjs';
import IconMapPin2 from '@tabler/icons-react-native/dist/esm/icons/IconMapPin2.mjs';
import IconPill from '@tabler/icons-react-native/dist/esm/icons/IconPill.mjs';
import IconStethoscope from '@tabler/icons-react-native/dist/esm/icons/IconStethoscope.mjs';
import IconHeartRateMonitor from '@tabler/icons-react-native/dist/esm/icons/IconHeartRateMonitor.mjs';
import IconVaccine from '@tabler/icons-react-native/dist/esm/icons/IconVaccine.mjs';
import IconDental from '@tabler/icons-react-native/dist/esm/icons/IconDental.mjs';
import IconEyeglass from '@tabler/icons-react-native/dist/esm/icons/IconEyeglass.mjs';
import IconFirstAidKit from '@tabler/icons-react-native/dist/esm/icons/IconFirstAidKit.mjs';
import IconNurse from '@tabler/icons-react-native/dist/esm/icons/IconNurse.mjs';
import IconWheelchair from '@tabler/icons-react-native/dist/esm/icons/IconWheelchair.mjs';
import IconMassage from '@tabler/icons-react-native/dist/esm/icons/IconMassage.mjs';
import IconYoga from '@tabler/icons-react-native/dist/esm/icons/IconYoga.mjs';
import IconBarbell from '@tabler/icons-react-native/dist/esm/icons/IconBarbell.mjs';
import IconRun from '@tabler/icons-react-native/dist/esm/icons/IconRun.mjs';
import IconSwimming from '@tabler/icons-react-native/dist/esm/icons/IconSwimming.mjs';
import IconHeartbeat from '@tabler/icons-react-native/dist/esm/icons/IconHeartbeat.mjs';
import IconMedicalCross from '@tabler/icons-react-native/dist/esm/icons/IconMedicalCross.mjs';
import IconBandage from '@tabler/icons-react-native/dist/esm/icons/IconBandage.mjs';
import IconMoodSmile from '@tabler/icons-react-native/dist/esm/icons/IconMoodSmile.mjs';
import IconMovie from '@tabler/icons-react-native/dist/esm/icons/IconMovie.mjs';
import IconDeviceTv from '@tabler/icons-react-native/dist/esm/icons/IconDeviceTv.mjs';
import IconMusic from '@tabler/icons-react-native/dist/esm/icons/IconMusic.mjs';
import IconHeadphones from '@tabler/icons-react-native/dist/esm/icons/IconHeadphones.mjs';
import IconDeviceGamepad2 from '@tabler/icons-react-native/dist/esm/icons/IconDeviceGamepad2.mjs';
import IconTicket from '@tabler/icons-react-native/dist/esm/icons/IconTicket.mjs';
import IconMicrophone2 from '@tabler/icons-react-native/dist/esm/icons/IconMicrophone2.mjs';
import IconBook from '@tabler/icons-react-native/dist/esm/icons/IconBook.mjs';
import IconPalette from '@tabler/icons-react-native/dist/esm/icons/IconPalette.mjs';
import IconConfetti from '@tabler/icons-react-native/dist/esm/icons/IconConfetti.mjs';
import IconBallFootball from '@tabler/icons-react-native/dist/esm/icons/IconBallFootball.mjs';
import IconBallBasketball from '@tabler/icons-react-native/dist/esm/icons/IconBallBasketball.mjs';
import IconBallTennis from '@tabler/icons-react-native/dist/esm/icons/IconBallTennis.mjs';
import IconPool from '@tabler/icons-react-native/dist/esm/icons/IconPool.mjs';
import IconCampfire from '@tabler/icons-react-native/dist/esm/icons/IconCampfire.mjs';
import IconCards from '@tabler/icons-react-native/dist/esm/icons/IconCards.mjs';
import IconChess from '@tabler/icons-react-native/dist/esm/icons/IconChess.mjs';
import IconPuzzle from '@tabler/icons-react-native/dist/esm/icons/IconPuzzle.mjs';
import IconGuitarPick from '@tabler/icons-react-native/dist/esm/icons/IconGuitarPick.mjs';
import IconShoppingBag from '@tabler/icons-react-native/dist/esm/icons/IconShoppingBag.mjs';
import IconShirt from '@tabler/icons-react-native/dist/esm/icons/IconShirt.mjs';
import IconShoe from '@tabler/icons-react-native/dist/esm/icons/IconShoe.mjs';
import IconHanger from '@tabler/icons-react-native/dist/esm/icons/IconHanger.mjs';
import IconGift from '@tabler/icons-react-native/dist/esm/icons/IconGift.mjs';
import IconDiamond from '@tabler/icons-react-native/dist/esm/icons/IconDiamond.mjs';
import IconBackpack from '@tabler/icons-react-native/dist/esm/icons/IconBackpack.mjs';
import IconPerfume from '@tabler/icons-react-native/dist/esm/icons/IconPerfume.mjs';
import IconTag from '@tabler/icons-react-native/dist/esm/icons/IconTag.mjs';
import IconSparkles from '@tabler/icons-react-native/dist/esm/icons/IconSparkles.mjs';
import IconBrush from '@tabler/icons-react-native/dist/esm/icons/IconBrush.mjs';
import IconCut from '@tabler/icons-react-native/dist/esm/icons/IconCut.mjs';
import IconScissors from '@tabler/icons-react-native/dist/esm/icons/IconScissors.mjs';
import IconHome from '@tabler/icons-react-native/dist/esm/icons/IconHome.mjs';
import IconSofa from '@tabler/icons-react-native/dist/esm/icons/IconSofa.mjs';
import IconBed from '@tabler/icons-react-native/dist/esm/icons/IconBed.mjs';
import IconBulb from '@tabler/icons-react-native/dist/esm/icons/IconBulb.mjs';
import IconDroplet from '@tabler/icons-react-native/dist/esm/icons/IconDroplet.mjs';
import IconFlame from '@tabler/icons-react-native/dist/esm/icons/IconFlame.mjs';
import IconWifi from '@tabler/icons-react-native/dist/esm/icons/IconWifi.mjs';
import IconPlugConnected from '@tabler/icons-react-native/dist/esm/icons/IconPlugConnected.mjs';
import IconTrash from '@tabler/icons-react-native/dist/esm/icons/IconTrash.mjs';
import IconTools from '@tabler/icons-react-native/dist/esm/icons/IconTools.mjs';
import IconHammer from '@tabler/icons-react-native/dist/esm/icons/IconHammer.mjs';
import IconKey from '@tabler/icons-react-native/dist/esm/icons/IconKey.mjs';
import IconBuilding from '@tabler/icons-react-native/dist/esm/icons/IconBuilding.mjs';
import IconBuildingCottage from '@tabler/icons-react-native/dist/esm/icons/IconBuildingCottage.mjs';
import IconWashMachine from '@tabler/icons-react-native/dist/esm/icons/IconWashMachine.mjs';
import IconAirConditioning from '@tabler/icons-react-native/dist/esm/icons/IconAirConditioning.mjs';
import IconBath from '@tabler/icons-react-native/dist/esm/icons/IconBath.mjs';
import IconFlower from '@tabler/icons-react-native/dist/esm/icons/IconFlower.mjs';
import IconPlant2 from '@tabler/icons-react-native/dist/esm/icons/IconPlant2.mjs';
import IconRecycle from '@tabler/icons-react-native/dist/esm/icons/IconRecycle.mjs';
import IconCash from '@tabler/icons-react-native/dist/esm/icons/IconCash.mjs';
import IconCashBanknote from '@tabler/icons-react-native/dist/esm/icons/IconCashBanknote.mjs';
import IconCreditCard from '@tabler/icons-react-native/dist/esm/icons/IconCreditCard.mjs';
import IconWallet from '@tabler/icons-react-native/dist/esm/icons/IconWallet.mjs';
import IconPigMoney from '@tabler/icons-react-native/dist/esm/icons/IconPigMoney.mjs';
import IconReportMoney from '@tabler/icons-react-native/dist/esm/icons/IconReportMoney.mjs';
import IconChartLine from '@tabler/icons-react-native/dist/esm/icons/IconChartLine.mjs';
import IconCoin from '@tabler/icons-react-native/dist/esm/icons/IconCoin.mjs';
import IconReceipt from '@tabler/icons-react-native/dist/esm/icons/IconReceipt.mjs';
import IconReceiptTax from '@tabler/icons-react-native/dist/esm/icons/IconReceiptTax.mjs';
import IconBuildingBank from '@tabler/icons-react-native/dist/esm/icons/IconBuildingBank.mjs';
import IconPercentage from '@tabler/icons-react-native/dist/esm/icons/IconPercentage.mjs';
import IconArrowsExchange from '@tabler/icons-react-native/dist/esm/icons/IconArrowsExchange.mjs';
import IconCertificate from '@tabler/icons-react-native/dist/esm/icons/IconCertificate.mjs';
import IconShield from '@tabler/icons-react-native/dist/esm/icons/IconShield.mjs';
import IconShieldCheck from '@tabler/icons-react-native/dist/esm/icons/IconShieldCheck.mjs';
import IconBusinessplan from '@tabler/icons-react-native/dist/esm/icons/IconBusinessplan.mjs';
import IconBriefcase from '@tabler/icons-react-native/dist/esm/icons/IconBriefcase.mjs';
import IconDeviceLaptop from '@tabler/icons-react-native/dist/esm/icons/IconDeviceLaptop.mjs';
import IconSchool from '@tabler/icons-react-native/dist/esm/icons/IconSchool.mjs';
import IconBook2 from '@tabler/icons-react-native/dist/esm/icons/IconBook2.mjs';
import IconPencil from '@tabler/icons-react-native/dist/esm/icons/IconPencil.mjs';
import IconPresentation from '@tabler/icons-react-native/dist/esm/icons/IconPresentation.mjs';
import IconUsers from '@tabler/icons-react-native/dist/esm/icons/IconUsers.mjs';
import IconBuildingSkyscraper from '@tabler/icons-react-native/dist/esm/icons/IconBuildingSkyscraper.mjs';
import IconClock from '@tabler/icons-react-native/dist/esm/icons/IconClock.mjs';
import IconNotebook from '@tabler/icons-react-native/dist/esm/icons/IconNotebook.mjs';
import IconCertificate2 from '@tabler/icons-react-native/dist/esm/icons/IconCertificate2.mjs';
import IconUserCheck from '@tabler/icons-react-native/dist/esm/icons/IconUserCheck.mjs';
import IconMail from '@tabler/icons-react-native/dist/esm/icons/IconMail.mjs';
import IconPhone from '@tabler/icons-react-native/dist/esm/icons/IconPhone.mjs';
import IconPaw from '@tabler/icons-react-native/dist/esm/icons/IconPaw.mjs';
import IconDog from '@tabler/icons-react-native/dist/esm/icons/IconDog.mjs';
import IconCat from '@tabler/icons-react-native/dist/esm/icons/IconCat.mjs';
import IconBone from '@tabler/icons-react-native/dist/esm/icons/IconBone.mjs';
import IconLuggage from '@tabler/icons-react-native/dist/esm/icons/IconLuggage.mjs';
import IconBeach from '@tabler/icons-react-native/dist/esm/icons/IconBeach.mjs';
import IconMountain from '@tabler/icons-react-native/dist/esm/icons/IconMountain.mjs';
import IconWorld from '@tabler/icons-react-native/dist/esm/icons/IconWorld.mjs';
import IconCamera from '@tabler/icons-react-native/dist/esm/icons/IconCamera.mjs';
import IconCompass from '@tabler/icons-react-native/dist/esm/icons/IconCompass.mjs';
import IconTent from '@tabler/icons-react-native/dist/esm/icons/IconTent.mjs';
import IconSunset2 from '@tabler/icons-react-native/dist/esm/icons/IconSunset2.mjs';
import IconBuildingArch from '@tabler/icons-react-native/dist/esm/icons/IconBuildingArch.mjs';
import IconDeviceMobile from '@tabler/icons-react-native/dist/esm/icons/IconDeviceMobile.mjs';
import IconDeviceDesktop from '@tabler/icons-react-native/dist/esm/icons/IconDeviceDesktop.mjs';
import IconPrinter from '@tabler/icons-react-native/dist/esm/icons/IconPrinter.mjs';
import IconRobot from '@tabler/icons-react-native/dist/esm/icons/IconRobot.mjs';
import IconCloud from '@tabler/icons-react-native/dist/esm/icons/IconCloud.mjs';
import IconBattery from '@tabler/icons-react-native/dist/esm/icons/IconBattery.mjs';
import IconServer from '@tabler/icons-react-native/dist/esm/icons/IconServer.mjs';
import IconWifi2 from '@tabler/icons-react-native/dist/esm/icons/IconWifi2.mjs';
import IconDeviceWatch from '@tabler/icons-react-native/dist/esm/icons/IconDeviceWatch.mjs';
import IconRouter from '@tabler/icons-react-native/dist/esm/icons/IconRouter.mjs';
import IconHeart from '@tabler/icons-react-native/dist/esm/icons/IconHeart.mjs';
import IconStar from '@tabler/icons-react-native/dist/esm/icons/IconStar.mjs';
import IconPin from '@tabler/icons-react-native/dist/esm/icons/IconPin.mjs';
import IconBabyCarriage from '@tabler/icons-react-native/dist/esm/icons/IconBabyCarriage.mjs';
import IconMoodKid from '@tabler/icons-react-native/dist/esm/icons/IconMoodKid.mjs';
import IconUserHeart from '@tabler/icons-react-native/dist/esm/icons/IconUserHeart.mjs';
import IconHandLoveYou from '@tabler/icons-react-native/dist/esm/icons/IconHandLoveYou.mjs';
import IconBuildingChurch from '@tabler/icons-react-native/dist/esm/icons/IconBuildingChurch.mjs';
import IconCross from '@tabler/icons-react-native/dist/esm/icons/IconCross.mjs';

import type { Icon } from '@tabler/icons-react-native';
import { FALLBACK_ICON } from './categoryIconData';

export { FALLBACK_ICON };
export {
  CATEGORY_ICON_GROUPS, CATEGORY_ICON_NAMES, KEYWORD_ICONS, EMOJI_TO_ICON, isCategoryIcon,
} from './categoryIconData';

type IconComponent = Icon;

export const CATEGORY_ICONS: Record<string, IconComponent> = {
  // Comida y bebida
  'tools-kitchen': IconToolsKitchen2, pizza: IconPizza, burger: IconBurger, meat: IconMeat,
  fish: IconFish, salad: IconSalad, soup: IconSoup, bread: IconBread, cheese: IconCheese,
  'ice-cream': IconIceCream2, cake: IconCake, candy: IconCandy, cookie: IconCookie,
  coffee: IconCoffee, cup: IconCup, beer: IconBeer, wine: IconGlassFull, bottle: IconBottle,
  milk: IconMilk, egg: IconEgg, carrot: IconCarrot, apple: IconApple, lemon: IconLemon,
  'chef-hat': IconChefHat, grill: IconGrillFork, bowl: IconBowl,
  'shopping-cart': IconShoppingCart, basket: IconBasket,
  // Transporte
  car: IconCar, 'car-suv': IconCarSuv, bus: IconBus, train: IconTrain, plane: IconPlane,
  bike: IconBike, motorbike: IconMotorbike, scooter: IconScooter, 'gas-station': IconGasStation,
  parking: IconParking, road: IconRoad, ship: IconShip, helicopter: IconHelicopter,
  walk: IconWalk, 'steering-wheel': IconSteeringWheel, truck: IconTir,
  'traffic-lights': IconTrafficLights, map: IconMap2, 'map-pin': IconMapPin2,
  // Salud
  pill: IconPill, stethoscope: IconStethoscope, 'heart-rate': IconHeartRateMonitor,
  vaccine: IconVaccine, dental: IconDental, eyeglass: IconEyeglass, 'first-aid': IconFirstAidKit,
  nurse: IconNurse, wheelchair: IconWheelchair, massage: IconMassage, yoga: IconYoga,
  barbell: IconBarbell, run: IconRun, swimming: IconSwimming, heartbeat: IconHeartbeat,
  'medical-cross': IconMedicalCross, bandage: IconBandage, 'mood-smile': IconMoodSmile,
  // Ocio
  movie: IconMovie, tv: IconDeviceTv, music: IconMusic, headphones: IconHeadphones,
  gamepad: IconDeviceGamepad2, ticket: IconTicket, microphone: IconMicrophone2,
  book: IconBook, palette: IconPalette, confetti: IconConfetti, football: IconBallFootball,
  basketball: IconBallBasketball, tennis: IconBallTennis, pool: IconPool, campfire: IconCampfire,
  cards: IconCards, chess: IconChess, puzzle: IconPuzzle, guitar: IconGuitarPick,
  // Compras y cuidado personal
  'shopping-bag': IconShoppingBag, shirt: IconShirt, shoe: IconShoe, hanger: IconHanger,
  gift: IconGift, diamond: IconDiamond, backpack: IconBackpack, perfume: IconPerfume,
  tag: IconTag, sparkles: IconSparkles, brush: IconBrush, haircut: IconCut, scissors: IconScissors,
  // Hogar
  home: IconHome, sofa: IconSofa, bed: IconBed, bulb: IconBulb, droplet: IconDroplet,
  flame: IconFlame, wifi: IconWifi, plug: IconPlugConnected, trash: IconTrash, tools: IconTools,
  hammer: IconHammer, key: IconKey, building: IconBuilding, cottage: IconBuildingCottage,
  'wash-machine': IconWashMachine, 'air-conditioning': IconAirConditioning, bath: IconBath,
  flower: IconFlower, plant: IconPlant2, recycle: IconRecycle,
  // Dinero
  cash: IconCash, banknote: IconCashBanknote, 'credit-card': IconCreditCard, wallet: IconWallet,
  'pig-money': IconPigMoney, 'report-money': IconReportMoney, 'chart-line': IconChartLine,
  coin: IconCoin, receipt: IconReceipt, 'receipt-tax': IconReceiptTax, bank: IconBuildingBank,
  percentage: IconPercentage, exchange: IconArrowsExchange, certificate: IconCertificate,
  shield: IconShield, 'shield-check': IconShieldCheck, businessplan: IconBusinessplan,
  // Trabajo y estudio
  briefcase: IconBriefcase, laptop: IconDeviceLaptop, school: IconSchool, book2: IconBook2,
  pencil: IconPencil, presentation: IconPresentation, users: IconUsers,
  skyscraper: IconBuildingSkyscraper, clock: IconClock, notebook: IconNotebook,
  diploma: IconCertificate2, 'user-check': IconUserCheck, mail: IconMail, phone: IconPhone,
  // Mascotas
  paw: IconPaw, dog: IconDog, cat: IconCat, bone: IconBone,
  // Viajes
  luggage: IconLuggage, beach: IconBeach, mountain: IconMountain, world: IconWorld,
  camera: IconCamera, compass: IconCompass, tent: IconTent, sunset: IconSunset2,
  monument: IconBuildingArch,
  // Tecnología
  mobile: IconDeviceMobile, desktop: IconDeviceDesktop, printer: IconPrinter, robot: IconRobot,
  cloud: IconCloud, battery: IconBattery, server: IconServer, antenna: IconWifi2,
  smartwatch: IconDeviceWatch, router: IconRouter,
  // Personal y otros
  heart: IconHeart, star: IconStar, pin: IconPin, baby: IconBabyCarriage, kid: IconMoodKid,
  'user-heart': IconUserHeart, 'hand-love': IconHandLoveYou, church: IconBuildingChurch,
  cross: IconCross,
};
