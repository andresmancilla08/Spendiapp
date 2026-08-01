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
import {
  // Comida y bebida
  IconToolsKitchen2, IconPizza, IconBurger, IconMeat, IconFish, IconSalad, IconSoup,
  IconBread, IconCheese, IconIceCream2, IconCake, IconCandy, IconCookie, IconCoffee,
  IconCup, IconBeer, IconGlassFull, IconBottle, IconMilk, IconEgg, IconCarrot,
  IconApple, IconLemon, IconChefHat, IconGrillFork, IconBowl, IconShoppingCart, IconBasket,
  // Transporte
  IconCar, IconCarSuv, IconBus, IconTrain, IconPlane, IconBike, IconMotorbike,
  IconScooter, IconGasStation, IconParking, IconRoad, IconShip, IconHelicopter,
  IconWalk, IconSteeringWheel, IconTir, IconTrafficLights, IconMap2, IconMapPin2,
  // Salud y bienestar
  IconPill, IconStethoscope, IconHeartRateMonitor, IconVaccine, IconDental, IconEyeglass,
  IconFirstAidKit, IconNurse, IconWheelchair, IconMassage, IconYoga, IconBarbell,
  IconRun, IconSwimming, IconHeartbeat, IconMedicalCross, IconBandage, IconMoodSmile,
  // Ocio
  IconMovie, IconDeviceTv, IconMusic, IconHeadphones, IconDeviceGamepad2, IconTicket,
  IconMicrophone2, IconBook, IconPalette, IconConfetti, IconBallFootball,
  IconBallBasketball, IconBallTennis, IconPool, IconCampfire, IconCards, IconChess,
  IconPuzzle, IconGuitarPick,
  // Compras y cuidado personal
  IconShoppingBag, IconShirt, IconShoe, IconHanger, IconGift, IconDiamond, IconBackpack,
  IconPerfume, IconTag, IconSparkles, IconBrush, IconCut, IconScissors,
  // Hogar
  IconHome, IconSofa, IconBed, IconBulb, IconDroplet, IconFlame, IconWifi,
  IconPlugConnected, IconTrash, IconTools, IconHammer, IconKey, IconBuilding,
  IconBuildingCottage, IconWashMachine, IconAirConditioning, IconBath, IconFlower,
  IconPlant2, IconRecycle,
  // Dinero
  IconCash, IconCashBanknote, IconCreditCard, IconWallet, IconPigMoney, IconReportMoney,
  IconChartLine, IconCoin, IconReceipt, IconReceiptTax, IconBuildingBank, IconPercentage,
  IconArrowsExchange, IconCertificate, IconShield, IconShieldCheck, IconBusinessplan,
  // Trabajo y estudio
  IconBriefcase, IconDeviceLaptop, IconSchool, IconBook2, IconPencil, IconPresentation,
  IconUsers, IconBuildingSkyscraper, IconClock, IconNotebook, IconCertificate2,
  IconUserCheck, IconMail, IconPhone,
  // Mascotas
  IconPaw, IconDog, IconCat, IconBone,
  // Viajes
  IconLuggage, IconBeach, IconMountain, IconWorld, IconCamera, IconCompass, IconTent,
  IconSunset2, IconBuildingArch,
  // Tecnología
  IconDeviceMobile, IconDeviceDesktop, IconPrinter, IconRobot, IconCloud, IconBattery,
  IconServer, IconWifi2, IconDeviceWatch, IconRouter,
  // Personal y otros
  IconHeart, IconStar, IconPin, IconBabyCarriage, IconMoodKid, IconUserHeart,
  IconHandLoveYou, IconBuildingChurch, IconCross,
} from '@tabler/icons-react-native';

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
