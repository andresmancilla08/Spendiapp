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
import IconToolsKitchen2 from '@tabler/icons-react-native/IconToolsKitchen2';
import IconPizza from '@tabler/icons-react-native/IconPizza';
import IconBurger from '@tabler/icons-react-native/IconBurger';
import IconMeat from '@tabler/icons-react-native/IconMeat';
import IconFish from '@tabler/icons-react-native/IconFish';
import IconSalad from '@tabler/icons-react-native/IconSalad';
import IconSoup from '@tabler/icons-react-native/IconSoup';
import IconBread from '@tabler/icons-react-native/IconBread';
import IconCheese from '@tabler/icons-react-native/IconCheese';
import IconIceCream2 from '@tabler/icons-react-native/IconIceCream2';
import IconCake from '@tabler/icons-react-native/IconCake';
import IconCandy from '@tabler/icons-react-native/IconCandy';
import IconCookie from '@tabler/icons-react-native/IconCookie';
import IconCoffee from '@tabler/icons-react-native/IconCoffee';
import IconCup from '@tabler/icons-react-native/IconCup';
import IconBeer from '@tabler/icons-react-native/IconBeer';
import IconGlassFull from '@tabler/icons-react-native/IconGlassFull';
import IconBottle from '@tabler/icons-react-native/IconBottle';
import IconMilk from '@tabler/icons-react-native/IconMilk';
import IconEgg from '@tabler/icons-react-native/IconEgg';
import IconCarrot from '@tabler/icons-react-native/IconCarrot';
import IconApple from '@tabler/icons-react-native/IconApple';
import IconLemon from '@tabler/icons-react-native/IconLemon';
import IconChefHat from '@tabler/icons-react-native/IconChefHat';
import IconGrillFork from '@tabler/icons-react-native/IconGrillFork';
import IconBowl from '@tabler/icons-react-native/IconBowl';
import IconShoppingCart from '@tabler/icons-react-native/IconShoppingCart';
import IconBasket from '@tabler/icons-react-native/IconBasket';
import IconCar from '@tabler/icons-react-native/IconCar';
import IconCarSuv from '@tabler/icons-react-native/IconCarSuv';
import IconBus from '@tabler/icons-react-native/IconBus';
import IconTrain from '@tabler/icons-react-native/IconTrain';
import IconPlane from '@tabler/icons-react-native/IconPlane';
import IconBike from '@tabler/icons-react-native/IconBike';
import IconMotorbike from '@tabler/icons-react-native/IconMotorbike';
import IconScooter from '@tabler/icons-react-native/IconScooter';
import IconGasStation from '@tabler/icons-react-native/IconGasStation';
import IconParking from '@tabler/icons-react-native/IconParking';
import IconRoad from '@tabler/icons-react-native/IconRoad';
import IconShip from '@tabler/icons-react-native/IconShip';
import IconHelicopter from '@tabler/icons-react-native/IconHelicopter';
import IconWalk from '@tabler/icons-react-native/IconWalk';
import IconSteeringWheel from '@tabler/icons-react-native/IconSteeringWheel';
import IconTir from '@tabler/icons-react-native/IconTir';
import IconTrafficLights from '@tabler/icons-react-native/IconTrafficLights';
import IconMap2 from '@tabler/icons-react-native/IconMap2';
import IconMapPin2 from '@tabler/icons-react-native/IconMapPin2';
import IconPill from '@tabler/icons-react-native/IconPill';
import IconStethoscope from '@tabler/icons-react-native/IconStethoscope';
import IconHeartRateMonitor from '@tabler/icons-react-native/IconHeartRateMonitor';
import IconVaccine from '@tabler/icons-react-native/IconVaccine';
import IconDental from '@tabler/icons-react-native/IconDental';
import IconEyeglass from '@tabler/icons-react-native/IconEyeglass';
import IconFirstAidKit from '@tabler/icons-react-native/IconFirstAidKit';
import IconNurse from '@tabler/icons-react-native/IconNurse';
import IconWheelchair from '@tabler/icons-react-native/IconWheelchair';
import IconMassage from '@tabler/icons-react-native/IconMassage';
import IconYoga from '@tabler/icons-react-native/IconYoga';
import IconBarbell from '@tabler/icons-react-native/IconBarbell';
import IconRun from '@tabler/icons-react-native/IconRun';
import IconSwimming from '@tabler/icons-react-native/IconSwimming';
import IconHeartbeat from '@tabler/icons-react-native/IconHeartbeat';
import IconMedicalCross from '@tabler/icons-react-native/IconMedicalCross';
import IconBandage from '@tabler/icons-react-native/IconBandage';
import IconMoodSmile from '@tabler/icons-react-native/IconMoodSmile';
import IconMovie from '@tabler/icons-react-native/IconMovie';
import IconDeviceTv from '@tabler/icons-react-native/IconDeviceTv';
import IconMusic from '@tabler/icons-react-native/IconMusic';
import IconHeadphones from '@tabler/icons-react-native/IconHeadphones';
import IconDeviceGamepad2 from '@tabler/icons-react-native/IconDeviceGamepad2';
import IconTicket from '@tabler/icons-react-native/IconTicket';
import IconMicrophone2 from '@tabler/icons-react-native/IconMicrophone2';
import IconBook from '@tabler/icons-react-native/IconBook';
import IconPalette from '@tabler/icons-react-native/IconPalette';
import IconConfetti from '@tabler/icons-react-native/IconConfetti';
import IconBallFootball from '@tabler/icons-react-native/IconBallFootball';
import IconBallBasketball from '@tabler/icons-react-native/IconBallBasketball';
import IconBallTennis from '@tabler/icons-react-native/IconBallTennis';
import IconPool from '@tabler/icons-react-native/IconPool';
import IconCampfire from '@tabler/icons-react-native/IconCampfire';
import IconCards from '@tabler/icons-react-native/IconCards';
import IconChess from '@tabler/icons-react-native/IconChess';
import IconPuzzle from '@tabler/icons-react-native/IconPuzzle';
import IconGuitarPick from '@tabler/icons-react-native/IconGuitarPick';
import IconShoppingBag from '@tabler/icons-react-native/IconShoppingBag';
import IconShirt from '@tabler/icons-react-native/IconShirt';
import IconShoe from '@tabler/icons-react-native/IconShoe';
import IconHanger from '@tabler/icons-react-native/IconHanger';
import IconGift from '@tabler/icons-react-native/IconGift';
import IconDiamond from '@tabler/icons-react-native/IconDiamond';
import IconBackpack from '@tabler/icons-react-native/IconBackpack';
import IconPerfume from '@tabler/icons-react-native/IconPerfume';
import IconTag from '@tabler/icons-react-native/IconTag';
import IconSparkles from '@tabler/icons-react-native/IconSparkles';
import IconBrush from '@tabler/icons-react-native/IconBrush';
import IconCut from '@tabler/icons-react-native/IconCut';
import IconScissors from '@tabler/icons-react-native/IconScissors';
import IconHome from '@tabler/icons-react-native/IconHome';
import IconSofa from '@tabler/icons-react-native/IconSofa';
import IconBed from '@tabler/icons-react-native/IconBed';
import IconBulb from '@tabler/icons-react-native/IconBulb';
import IconDroplet from '@tabler/icons-react-native/IconDroplet';
import IconFlame from '@tabler/icons-react-native/IconFlame';
import IconWifi from '@tabler/icons-react-native/IconWifi';
import IconPlugConnected from '@tabler/icons-react-native/IconPlugConnected';
import IconTrash from '@tabler/icons-react-native/IconTrash';
import IconTools from '@tabler/icons-react-native/IconTools';
import IconHammer from '@tabler/icons-react-native/IconHammer';
import IconKey from '@tabler/icons-react-native/IconKey';
import IconBuilding from '@tabler/icons-react-native/IconBuilding';
import IconBuildingCottage from '@tabler/icons-react-native/IconBuildingCottage';
import IconWashMachine from '@tabler/icons-react-native/IconWashMachine';
import IconAirConditioning from '@tabler/icons-react-native/IconAirConditioning';
import IconBath from '@tabler/icons-react-native/IconBath';
import IconFlower from '@tabler/icons-react-native/IconFlower';
import IconPlant2 from '@tabler/icons-react-native/IconPlant2';
import IconRecycle from '@tabler/icons-react-native/IconRecycle';
import IconCash from '@tabler/icons-react-native/IconCash';
import IconCashBanknote from '@tabler/icons-react-native/IconCashBanknote';
import IconCreditCard from '@tabler/icons-react-native/IconCreditCard';
import IconWallet from '@tabler/icons-react-native/IconWallet';
import IconPigMoney from '@tabler/icons-react-native/IconPigMoney';
import IconReportMoney from '@tabler/icons-react-native/IconReportMoney';
import IconChartLine from '@tabler/icons-react-native/IconChartLine';
import IconCoin from '@tabler/icons-react-native/IconCoin';
import IconReceipt from '@tabler/icons-react-native/IconReceipt';
import IconReceiptTax from '@tabler/icons-react-native/IconReceiptTax';
import IconBuildingBank from '@tabler/icons-react-native/IconBuildingBank';
import IconPercentage from '@tabler/icons-react-native/IconPercentage';
import IconArrowsExchange from '@tabler/icons-react-native/IconArrowsExchange';
import IconCertificate from '@tabler/icons-react-native/IconCertificate';
import IconShield from '@tabler/icons-react-native/IconShield';
import IconShieldCheck from '@tabler/icons-react-native/IconShieldCheck';
import IconBusinessplan from '@tabler/icons-react-native/IconBusinessplan';
import IconBriefcase from '@tabler/icons-react-native/IconBriefcase';
import IconDeviceLaptop from '@tabler/icons-react-native/IconDeviceLaptop';
import IconSchool from '@tabler/icons-react-native/IconSchool';
import IconBook2 from '@tabler/icons-react-native/IconBook2';
import IconPencil from '@tabler/icons-react-native/IconPencil';
import IconPresentation from '@tabler/icons-react-native/IconPresentation';
import IconUsers from '@tabler/icons-react-native/IconUsers';
import IconBuildingSkyscraper from '@tabler/icons-react-native/IconBuildingSkyscraper';
import IconClock from '@tabler/icons-react-native/IconClock';
import IconNotebook from '@tabler/icons-react-native/IconNotebook';
import IconCertificate2 from '@tabler/icons-react-native/IconCertificate2';
import IconUserCheck from '@tabler/icons-react-native/IconUserCheck';
import IconMail from '@tabler/icons-react-native/IconMail';
import IconPhone from '@tabler/icons-react-native/IconPhone';
import IconPaw from '@tabler/icons-react-native/IconPaw';
import IconDog from '@tabler/icons-react-native/IconDog';
import IconCat from '@tabler/icons-react-native/IconCat';
import IconBone from '@tabler/icons-react-native/IconBone';
import IconLuggage from '@tabler/icons-react-native/IconLuggage';
import IconBeach from '@tabler/icons-react-native/IconBeach';
import IconMountain from '@tabler/icons-react-native/IconMountain';
import IconWorld from '@tabler/icons-react-native/IconWorld';
import IconCamera from '@tabler/icons-react-native/IconCamera';
import IconCompass from '@tabler/icons-react-native/IconCompass';
import IconTent from '@tabler/icons-react-native/IconTent';
import IconSunset2 from '@tabler/icons-react-native/IconSunset2';
import IconBuildingArch from '@tabler/icons-react-native/IconBuildingArch';
import IconDeviceMobile from '@tabler/icons-react-native/IconDeviceMobile';
import IconDeviceDesktop from '@tabler/icons-react-native/IconDeviceDesktop';
import IconPrinter from '@tabler/icons-react-native/IconPrinter';
import IconRobot from '@tabler/icons-react-native/IconRobot';
import IconCloud from '@tabler/icons-react-native/IconCloud';
import IconBattery from '@tabler/icons-react-native/IconBattery';
import IconServer from '@tabler/icons-react-native/IconServer';
import IconWifi2 from '@tabler/icons-react-native/IconWifi2';
import IconDeviceWatch from '@tabler/icons-react-native/IconDeviceWatch';
import IconRouter from '@tabler/icons-react-native/IconRouter';
import IconHeart from '@tabler/icons-react-native/IconHeart';
import IconStar from '@tabler/icons-react-native/IconStar';
import IconPin from '@tabler/icons-react-native/IconPin';
import IconBabyCarriage from '@tabler/icons-react-native/IconBabyCarriage';
import IconMoodKid from '@tabler/icons-react-native/IconMoodKid';
import IconUserHeart from '@tabler/icons-react-native/IconUserHeart';
import IconHandLoveYou from '@tabler/icons-react-native/IconHandLoveYou';
import IconBuildingChurch from '@tabler/icons-react-native/IconBuildingChurch';
import IconCross from '@tabler/icons-react-native/IconCross';

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
