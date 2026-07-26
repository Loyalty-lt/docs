/**
 * Maps Mintlify's Font Awesome icon slugs (`icon="coins"`) to react-icons/fa6
 * components. Built by cross-checking every `icon="..."` value used anywhere in
 * `docs/` against the actual fa6 export list — see the migration commit for the
 * verification script. All 93 slugs used at the time resolve to a real icon.
 *
 * A handful predate FA6's naming and are mapped to their renamed equivalent
 * (`cog` -> gear, `search` -> magnifying-glass, `history` -> clock-rotate-left).
 * `webhook` has no FA6 free glyph; it stands in on `code` as the closest
 * available shape rather than rendering nothing.
 */
import {
  FaArrowRight, FaBolt, FaBook, FaBox, FaBuilding, FaCalendarXmark, FaCartShopping,
  FaCashRegister, FaChartBar, FaChartLine, FaChartPie, FaCheck, FaCircleCheck,
  FaClipboardList, FaClock, FaClockRotateLeft, FaCode, FaGear, FaCoins, FaCopy,
  FaCreditCard, FaDatabase, FaDesktop, FaDollarSign, FaDownload, FaPenToSquare,
  FaEnvelope, FaTriangleExclamation, FaEye, FaFileArrowUp, FaFileLines, FaFlask,
  FaGamepad, FaGauge, FaGift, FaGithub, FaGraduationCap, FaHashtag, FaHeadset,
  FaHeartPulse, FaIdCard, FaCircleInfo, FaJs, FaKey, FaLayerGroup, FaLink, FaList,
  FaLock, FaMagnifyingGlass, FaBullhorn, FaMessage, FaMinus, FaCircleMinus, FaMobile,
  FaNodeJs, FaPaintbrush, FaPalette, FaPhone, FaPhp, FaPlay, FaPlus, FaCirclePlus,
  FaPuzzlePiece, FaPython, FaQrcode, FaReact, FaReceipt, FaRotate, FaRobot, FaShield,
  FaShieldHalved, FaStar, FaStore, FaTable, FaTag, FaTicket, FaUser, FaUserPlus,
  FaUserSlash, FaUsers, FaWallet, FaWifi, FaXmark,
} from 'react-icons/fa6';
import type { IconType } from 'react-icons';

export const ICONS: Record<string, IconType> = {
  'arrow-right': FaArrowRight, bolt: FaBolt, book: FaBook, box: FaBox, building: FaBuilding,
  'calendar-times': FaCalendarXmark, 'cart-shopping': FaCartShopping, 'cash-register': FaCashRegister,
  'chart-bar': FaChartBar, 'chart-line': FaChartLine, 'chart-pie': FaChartPie, check: FaCheck,
  'check-circle': FaCircleCheck, 'clipboard-list': FaClipboardList, clock: FaClock,
  'clock-rotate-left': FaClockRotateLeft, code: FaCode, cog: FaGear, coins: FaCoins, copy: FaCopy,
  'credit-card': FaCreditCard, database: FaDatabase, desktop: FaDesktop, 'dollar-sign': FaDollarSign,
  download: FaDownload, edit: FaPenToSquare, envelope: FaEnvelope,
  'exclamation-triangle': FaTriangleExclamation, eye: FaEye, 'file-arrow-up': FaFileArrowUp,
  'file-lines': FaFileLines, 'file-text': FaFileLines, flask: FaFlask, gamepad: FaGamepad,
  gauge: FaGauge, gift: FaGift, github: FaGithub, 'graduation-cap': FaGraduationCap,
  hashtag: FaHashtag, headset: FaHeadset, 'heart-pulse': FaHeartPulse, heartbeat: FaHeartPulse,
  history: FaClockRotateLeft, 'id-card': FaIdCard, info: FaCircleInfo, js: FaJs, key: FaKey,
  'layer-group': FaLayerGroup, link: FaLink, list: FaList, lock: FaLock,
  'magnifying-glass': FaMagnifyingGlass, megaphone: FaBullhorn, message: FaMessage, minus: FaMinus,
  'minus-circle': FaCircleMinus, mobile: FaMobile, 'node-js': FaNodeJs, 'paint-brush': FaPaintbrush,
  palette: FaPalette, phone: FaPhone, php: FaPhp, play: FaPlay, plus: FaPlus,
  'plus-circle': FaCirclePlus, 'puzzle-piece': FaPuzzlePiece, python: FaPython, qrcode: FaQrcode,
  react: FaReact, receipt: FaReceipt, refresh: FaRotate, robot: FaRobot, rotate: FaRotate,
  search: FaMagnifyingGlass, settings: FaGear, shield: FaShield, 'shield-check': FaShieldHalved,
  star: FaStar, store: FaStore, table: FaTable, 'tachometer-alt': FaGauge, tag: FaTag,
  ticket: FaTicket, 'triangle-exclamation': FaTriangleExclamation, user: FaUser,
  'user-plus': FaUserPlus, 'user-slash': FaUserSlash, users: FaUsers, wallet: FaWallet,
  webhook: FaCode, wifi: FaWifi, xmark: FaXmark, zap: FaBolt,
};
