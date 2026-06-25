export type OperatingCity = {
  name: string;
  code: string;
  shortName: string;
  theme: string;
  districts: string[];
};

export const OPERATING_CITIES: OperatingCity[] = [
  {
    name: '北京',
    code: 'beijing',
    shortName: '京',
    theme: 'from-[#5B7CFA] to-[#7C5CFC]',
    districts: ['东城区', '西城区', '朝阳区', '海淀区', '丰台区', '石景山区', '通州区', '昌平区', '大兴区', '顺义区', '房山区', '门头沟区'],
  },
  {
    name: '上海',
    code: 'shanghai',
    shortName: '沪',
    theme: 'from-[#14B8A6] to-[#0EA5E9]',
    districts: ['黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '杨浦区', '浦东新区', '闵行区', '宝山区', '嘉定区', '松江区'],
  },
  {
    name: '杭州',
    code: 'hangzhou',
    shortName: '杭',
    theme: 'from-[#22C55E] to-[#84CC16]',
    districts: ['上城区', '拱墅区', '西湖区', '滨江区', '萧山区', '余杭区', '临平区', '钱塘区', '富阳区', '临安区'],
  },
  {
    name: '深圳',
    code: 'shenzhen',
    shortName: '深',
    theme: 'from-[#F97316] to-[#EF4444]',
    districts: ['福田区', '罗湖区', '南山区', '盐田区', '宝安区', '龙岗区', '龙华区', '坪山区', '光明区', '大鹏新区'],
  },
  {
    name: '成都',
    code: 'chengdu',
    shortName: '蓉',
    theme: 'from-[#F59E0B] to-[#EC4899]',
    districts: ['锦江区', '青羊区', '金牛区', '武侯区', '成华区', '龙泉驿区', '青白江区', '新都区', '温江区', '双流区', '郫都区', '高新区'],
  },
  {
    name: '武汉',
    code: 'wuhan',
    shortName: '汉',
    theme: 'from-[#6366F1] to-[#06B6D4]',
    districts: ['江岸区', '江汉区', '硚口区', '汉阳区', '武昌区', '青山区', '洪山区', '东西湖区', '汉南区', '蔡甸区', '江夏区', '黄陂区', '新洲区'],
  },
];

export const cityNames = OPERATING_CITIES.map((city) => city.name);

export const cityDistrictMap = OPERATING_CITIES.reduce<Record<string, string[]>>((acc, city) => {
  acc[city.name] = city.districts;
  return acc;
}, {});
