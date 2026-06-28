(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();
  var gold = style.getPropertyValue('--gold').trim();
  function resize(chart){ window.addEventListener('resize', function(){ chart.resize(); }); }
  var el1 = document.getElementById('chart-composition');
  if (el1) {
    var chart1 = echarts.init(el1, null, { renderer: 'svg' });
    chart1.setOption({
      animation: false,
      color: [accent, accent2, gold],
      tooltip: { trigger: 'axis', appendToBody: true },
      grid: { left: 40, right: 20, top: 30, bottom: 40 },
      xAxis: { type: 'category', data: ['后端 Go 文件','数据库迁移','管理端页面','用户端 TSX'], axisLabel: { color: muted }, axisLine: { lineStyle: { color: rule } } },
      yAxis: { type: 'value', axisLabel: { color: muted }, splitLine: { lineStyle: { color: rule } } },
      series: [{ type: 'bar', data: [57,17,21,2], barWidth: 34, itemStyle: { borderRadius: [10,10,0,0] } }]
    });
    resize(chart1);
  }
  var el2 = document.getElementById('chart-services');
  if (el2) {
    var chart2 = echarts.init(el2, null, { renderer: 'svg' });
    chart2.setOption({
      animation: false,
      tooltip: { trigger: 'item', appendToBody: true },
      legend: { bottom: 0, textStyle: { color: muted } },
      radar: {
        indicator: [
          { name: '入口', max: 5 }, { name: '账号', max: 5 }, { name: '订单', max: 5 },
          { name: '达人', max: 5 }, { name: '支付', max: 5 }, { name: '派单', max: 5 }
        ],
        axisName: { color: muted },
        splitLine: { lineStyle: { color: rule } },
        splitArea: { areaStyle: { color: [bg2, 'transparent'] } },
        axisLine: { lineStyle: { color: rule } }
      },
      series: [{
        type: 'radar',
        data: [
          { value: [5,2,3,2,2,2], name: 'gateway', areaStyle: { opacity: .18 } },
          { value: [1,5,1,2,1,1], name: 'user', areaStyle: { opacity: .14 } },
          { value: [1,1,5,2,2,3], name: 'order', areaStyle: { opacity: .14 } },
          { value: [1,2,1,5,1,2], name: 'talent', areaStyle: { opacity: .14 } },
          { value: [1,1,3,1,5,1], name: 'payment', areaStyle: { opacity: .14 } },
          { value: [1,1,4,4,1,5], name: 'dispatch', areaStyle: { opacity: .14 } }
        ],
        color: [accent, accent2, gold, accent + 'aa', accent2 + 'aa', muted]
      }]
    });
    resize(chart2);
  }
})();