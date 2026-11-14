/* Local SVG flags, matched against country fields only, never guessed from city. */
(function (root) {
  'use strict';
  const rows = [
    ['AE','ARE','United Arab Emirates','阿联酋','阿拉伯联合酋长国','UAE'],
    ['AR','ARG','Argentina','阿根廷'], ['AT','AUT','Austria','奥地利'],
    ['AU','AUS','Australia','澳大利亚','澳洲'], ['BE','BEL','Belgium','比利时'],
    ['BG','BGR','Bulgaria','保加利亚'], ['BR','BRA','Brazil','巴西'],
    ['CA','CAN','Canada','加拿大'], ['CH','CHE','Switzerland','瑞士'],
    ['CL','CHL','Chile','智利'], ['CN','CHN','China','中国','中华人民共和国','中華人民共和國','PRC'],
    ['CO','COL','Colombia','哥伦比亚'], ['CZ','CZE','Czechia','捷克','Czech Republic'],
    ['DE','DEU','Germany','德国'], ['DK','DNK','Denmark','丹麦'],
    ['EG','EGY','Egypt','埃及'], ['ES','ESP','Spain','西班牙'],
    ['FI','FIN','Finland','芬兰'], ['FR','FRA','France','法国'],
    ['GB','GBR','United Kingdom','英国','UK','Great Britain','Britain'],
    ['GR','GRC','Greece','希腊'], ['HK','HKG','Hong Kong','香港','Hong Kong SAR China','中国香港'],
    ['HU','HUN','Hungary','匈牙利'], ['ID','IDN','Indonesia','印度尼西亚','印尼'],
    ['IE','IRL','Ireland','爱尔兰'], ['IL','ISR','Israel','以色列'],
    ['IN','IND','India','印度'], ['IS','ISL','Iceland','冰岛'],
    ['IT','ITA','Italy','意大利'], ['JP','JPN','Japan','日本'],
    ['KE','KEN','Kenya','肯尼亚'], ['KH','KHM','Cambodia','柬埔寨'],
    ['KR','KOR','South Korea','韩国','韓國','南韩','Republic of Korea','Korea, Republic of'],
    ['LA','LAO','Laos','老挝','Lao PDR'], ['LK','LKA','Sri Lanka','斯里兰卡'],
    ['MA','MAR','Morocco','摩洛哥'], ['MM','MMR','Myanmar','缅甸','Burma'],
    ['MO','MAC','Macao','澳门','Macau','Macao SAR China','中国澳门'],
    ['MX','MEX','Mexico','墨西哥'], ['MY','MYS','Malaysia','马来西亚'],
    ['NG','NGA','Nigeria','尼日利亚'], ['NL','NLD','Netherlands','荷兰','The Netherlands'],
    ['NO','NOR','Norway','挪威'], ['NP','NPL','Nepal','尼泊尔'],
    ['NZ','NZL','New Zealand','新西兰'], ['PE','PER','Peru','秘鲁'],
    ['PH','PHL','Philippines','菲律宾','The Philippines'], ['PK','PAK','Pakistan','巴基斯坦'],
    ['PL','POL','Poland','波兰'], ['PT','PRT','Portugal','葡萄牙'],
    ['RO','ROU','Romania','罗马尼亚'], ['RS','SRB','Serbia','塞尔维亚'],
    ['RU','RUS','Russia','俄罗斯','Russian Federation'], ['SA','SAU','Saudi Arabia','沙特阿拉伯'],
    ['SE','SWE','Sweden','瑞典'], ['SG','SGP','Singapore','新加坡','Singapura'],
    ['TH','THA','Thailand','泰国'], ['TR','TUR','Türkiye','土耳其','Turkey'],
    ['TW','TWN','Taiwan','台湾','台灣'], ['UA','UKR','Ukraine','乌克兰'],
    ['US','USA','United States','美国','United States of America','America'],
    ['UY','URY','Uruguay','乌拉圭'], ['VN','VNM','Vietnam','越南','Viet Nam'],
    ['ZA','ZAF','South Africa','南非']
  ];
  const normalize = value => typeof value === 'string' && value.length <= 100 ? value.normalize('NFKC').toLowerCase().replace(/[\s.,，。'’()（）_-]+/g, '') : '';
  const aliases = new Map();
  for (const row of rows) for (const alias of row) aliases.set(normalize(alias), row[0]);
  for (const locale of ['en', 'zh-Hans', 'zh-Hant']) {
    try {
      const names = new Intl.DisplayNames([locale], {type: 'region'});
      for (const [code] of rows) aliases.set(normalize(names.of(code)), code);
    } catch { /* Explicit names still work without Intl.DisplayNames. */ }
  }
  const api = {
    codes: rows.map(row => row[0]),
    resolve: value => aliases.get(normalize(value)) || '',
    name(code, locale) {
      try { return new Intl.DisplayNames([locale], {type: 'region'}).of(code); }
      catch { return rows.find(row => row[0] === code)?.[2] || ''; }
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ProfileCountryFlags = api;
})(typeof window !== 'undefined' ? window : globalThis);
