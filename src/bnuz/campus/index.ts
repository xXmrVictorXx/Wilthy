// 数字京师·珠海统一身份认证会话：课表、成绩、培养方案共用同一个登录态。
export {
  CampusAuthError,
  campusRequest,
  flushCampusSession,
  getCampusSession,
  hiddenCampusLogin,
  openCampusLoginWindow,
} from './main/session';
export {
  CAS_LOGIN_URL,
  currentTerm,
  fromJwxtTerm,
  JWXT_ORIGIN,
  jwxtRequest,
  jwxtToken,
  openJwxtLoginWindow,
  toJwxtTerm,
} from './main/jwxt';
