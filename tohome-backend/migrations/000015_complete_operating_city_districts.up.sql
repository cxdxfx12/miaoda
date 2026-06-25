-- 补齐 6 个运营城市的服务区，并加入武汉覆盖
UPDATE technicians
SET service_districts = '["东城区","西城区","朝阳区","海淀区","丰台区","石景山区","通州区","昌平区","大兴区","顺义区","房山区","门头沟区"]'::jsonb
WHERE service_city = '北京';

UPDATE technicians
SET service_districts = '["黄浦区","徐汇区","长宁区","静安区","普陀区","虹口区","杨浦区","浦东新区","闵行区","宝山区","嘉定区","松江区"]'::jsonb
WHERE service_city = '上海';

UPDATE technicians
SET service_districts = '["上城区","拱墅区","西湖区","滨江区","萧山区","余杭区","临平区","钱塘区","富阳区","临安区"]'::jsonb
WHERE service_city = '杭州';

UPDATE technicians
SET service_districts = '["福田区","罗湖区","南山区","盐田区","宝安区","龙岗区","龙华区","坪山区","光明区","大鹏新区"]'::jsonb
WHERE service_city = '深圳';

UPDATE technicians
SET service_districts = '["锦江区","青羊区","金牛区","武侯区","成华区","龙泉驿区","青白江区","新都区","温江区","双流区","郫都区","高新区"]'::jsonb
WHERE service_city = '成都';

UPDATE technicians
SET service_city = '武汉',
    service_districts = '["江岸区","江汉区","硚口区","汉阳区","武昌区","青山区","洪山区","东西湖区","汉南区","蔡甸区","江夏区","黄陂区","新洲区"]'::jsonb
WHERE id BETWEEN 86 AND 97;

UPDATE technicians
SET service_districts = '["江岸区","江汉区","硚口区","汉阳区","武昌区","青山区","洪山区","东西湖区","汉南区","蔡甸区","江夏区","黄陂区","新洲区"]'::jsonb
WHERE service_city = '武汉';
