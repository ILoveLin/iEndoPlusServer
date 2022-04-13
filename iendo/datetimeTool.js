var datetimeTool = {};
datetimeTool.addDate = function(date, days) {
    if (days == undefined || days == '') {
        days = 1;
    }
    var date = new Date(date);
    date.setDate(date.getDate() + days);
    var month = date.getMonth() + 1;
    var day = date.getDate();
    return date.getFullYear() + '-' + getFormatDate(month) + '-' + getFormatDate(day);
}

datetimeTool.toDate = function(date, fmt) {
    let ret;
    const utc = date.getTimezoneOffset() / 60;
    const opt = {
      'Y+': date.getFullYear().toString(), // 年
      'm+': (date.getMonth() + 1).toString(), // 月
      'd+': date.getDate().toString(), // 日
      "H+": date.getHours().toString(),           // 时
      //'H+': (date.getHours() + utc < 0 ? 24 + date.getHours() + utc : date.getHours() + utc).toString(), // 时(转UTC时间)
      'M+': date.getMinutes().toString(), // 分
      'S+': date.getSeconds().toString() // 秒
      // 有其他格式化字符需求可以继续添加，必须转化成字符串
    };
    for (const k in opt) {
      ret = new RegExp('(' + k + ')').exec(fmt);
      if (ret) {
        fmt = fmt.replace(ret[1], (ret[1].length == 1) ? (opt[k]) : (opt[k].padStart(ret[1].length, '0')));
      }
    }
    return fmt;
}

module.exports = datetimeTool;