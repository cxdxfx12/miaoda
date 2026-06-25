// 地址编辑页面 - 新建/编辑收货地址
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CaretLeft, MapPin, CheckCircle } from '../components/Icon';
import { useNavigation, useRoute } from '@react-navigation/native';
import { userApi, Address } from '../api/user';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../theme';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { validatePhone } from '../utils';

const PROVINCES = ['北京市', '上海市', '广东省', '浙江省', '江苏省', '四川省', '湖北省', '湖南省', '福建省', '山东省'];
const CITIES: Record<string, string[]> = {
  '北京市': ['朝阳区', '海淀区', '丰台区', '通州区', '大兴区', '昌平区'],
  '上海市': ['浦东新区', '徐汇区', '静安区', '长宁区', '普陀区', '杨浦区'],
  '广东省': ['广州市', '深圳市', '东莞市', '佛山市', '珠海市', '惠州市'],
  '浙江省': ['杭州市', '宁波市', '温州市', '嘉兴市', '湖州市', '绍兴市'],
  '江苏省': ['南京市', '苏州市', '无锡市', '常州市', '南通市', '徐州市'],
  '四川省': ['成都市', '绵阳市', '德阳市', '宜宾市', '南充市', '泸州市'],
  '湖北省': ['武汉市', '宜昌市', '襄阳市', '荆州市', '黄石市', '十堰市'],
  '湖南省': ['长沙市', '株洲市', '湘潭市', '衡阳市', '岳阳市', '常德市'],
  '福建省': ['福州市', '厦门市', '泉州市', '漳州市', '莆田市', '龙岩市'],
  '山东省': ['济南市', '青岛市', '烟台市', '潍坊市', '临沂市', '淄博市'],
};

const TAGS = ['家', '公司', '学校', '父母家', '其他'];

export default function AddressEditScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const qc = useQueryClient();
  const editId = route.params?.id as number | undefined;
  const isEdit = !!editId;

  // 表单状态
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [province, setProvince] = useState('北京市');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [detail, setDetail] = useState('');
  const [tag, setTag] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // UI状态
  const [provinceExpanded, setProvinceExpanded] = useState(false);
  const [cityExpanded, setCityExpanded] = useState(false);
  const [districtExpanded, setDistrictExpanded] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 如果是编辑模式，加载已有地址数据
  useEffect(() => {
    if (isEdit && editId) {
      userApi.listAddresses().then((res: any) => {
        const list = res?.data?.list || [];
        const addr = list.find((a: Address) => a.id === editId);
        if (addr) {
          setContactName(addr.contact_name);
          setContactPhone(addr.contact_phone);
          setProvince(addr.province);
          setCity(addr.city);
          setDistrict(addr.district);
          setDetail(addr.detail);
          setTag(addr.tag || '');
          setIsDefault(addr.is_default === 1);
        }
      });
    }
  }, [editId]);

  // 保存
  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        contact_name: contactName,
        contact_phone: contactPhone,
        province,
        city,
        district,
        detail,
        lat: 0,
        lng: 0,
        tag,
        is_default: isDefault ? 1 : 0,
      };
      if (isEdit && editId) {
        return userApi.updateAddress(editId, data);
      }
      return userApi.createAddress(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['addresses'] });
      nav.goBack();
    },
    onError: () => {
      Alert.alert('保存失败', '请稍后重试');
    },
  });

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!contactName.trim()) errs.name = '请输入联系人姓名';
    if (!validatePhone(contactPhone)) errs.phone = '请输入正确的手机号';
    if (!province) errs.province = '请选择省份';
    if (!city) errs.city = '请选择城市';
    if (!district) errs.district = '请选择区/县';
    if (!detail.trim()) errs.detail = '请输入详细地址';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      saveMutation.mutate();
    }
  };

  const handleSelectProvince = (p: string) => {
    setProvince(p);
    setCity('');
    setDistrict('');
    setProvinceExpanded(false);
  };

  const handleSelectCity = (c: string) => {
    setCity(c);
    setDistrict('');
    setCityExpanded(false);
  };

  const handleSelectDistrict = (d: string) => {
    setDistrict(d);
    setDistrictExpanded(false);
  };

  const cityOptions = province ? (CITIES[province] || []) : [];
  const districtOptions = city ? getDistrictsForCity(city) : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <CaretLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? '编辑地址' : '新增地址'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saveMutation.isPending}>
          <Text style={[styles.saveBtn, saveMutation.isPending && { opacity: 0.5 }]}>
            {saveMutation.isPending ? '保存中...' : '保存'}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          {/* 联系人信息 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>联系人信息</Text>
            <Input
              label="联系人"
              placeholder="请输入姓名"
              value={contactName}
              onChangeText={setContactName}
              error={errors.name}
              required
            />
            <Input
              label="手机号"
              placeholder="请输入手机号"
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
              maxLength={11}
              error={errors.phone}
              required
            />
          </View>

          {/* 所在地区 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>所在地区</Text>

            {/* 省份选择 */}
            <Text style={styles.label}>省份 <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity
              style={[styles.selector, errors.province && styles.selectorError]}
              onPress={() => {
                setProvinceExpanded(!provinceExpanded);
                setCityExpanded(false);
                setDistrictExpanded(false);
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MapPin size={16} color={province ? colors.textPrimary : colors.textTertiary} />
                <Text style={[styles.selectorText, !province && { color: colors.textTertiary }]}>
                  {province || '请选择省份'}
                </Text>
              </View>
              <CaretLeft size={14} color={colors.textTertiary}
                style={{ transform: [{ rotate: provinceExpanded ? '90deg' : '-90deg' }] }} />
            </TouchableOpacity>
            {errors.province && <Text style={styles.errorText}>{errors.province}</Text>}
            {provinceExpanded && (
              <View style={styles.dropdown}>
                {PROVINCES.map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.dropdownItem, p === province && styles.dropdownItemActive]}
                    onPress={() => handleSelectProvince(p)}>
                    <Text style={[styles.dropdownText, p === province && styles.dropdownTextActive]}>
                      {p}
                    </Text>
                    {p === province && <CheckCircle size={16} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* 城市选择 */}
            <Text style={styles.label}>城市 <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity
              style={[styles.selector, !province && styles.selectorDisabled, errors.city && styles.selectorError]}
              onPress={() => {
                if (!province) return;
                setCityExpanded(!cityExpanded);
                setProvinceExpanded(false);
                setDistrictExpanded(false);
              }}
              disabled={!province}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MapPin size={16} color={city ? colors.textPrimary : colors.textTertiary} />
                <Text style={[styles.selectorText, !city && { color: colors.textTertiary }]}>
                  {city || '请选择城市'}
                </Text>
              </View>
              <CaretLeft size={14} color={colors.textTertiary}
                style={{ transform: [{ rotate: cityExpanded ? '90deg' : '-90deg' }] }} />
            </TouchableOpacity>
            {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
            {cityExpanded && (
              <View style={styles.dropdown}>
                {cityOptions.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.dropdownItem, c === city && styles.dropdownItemActive]}
                    onPress={() => handleSelectCity(c)}>
                    <Text style={[styles.dropdownText, c === city && styles.dropdownTextActive]}>
                      {c}
                    </Text>
                    {c === city && <CheckCircle size={16} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* 区/县选择 */}
            <Text style={styles.label}>区/县 <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity
              style={[styles.selector, !city && styles.selectorDisabled, errors.district && styles.selectorError]}
              onPress={() => {
                if (!city) return;
                setDistrictExpanded(!districtExpanded);
                setProvinceExpanded(false);
                setCityExpanded(false);
              }}
              disabled={!city}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MapPin size={16} color={district ? colors.textPrimary : colors.textTertiary} />
                <Text style={[styles.selectorText, !district && { color: colors.textTertiary }]}>
                  {district || '请选择区/县'}
                </Text>
              </View>
              <CaretLeft size={14} color={colors.textTertiary}
                style={{ transform: [{ rotate: districtExpanded ? '90deg' : '-90deg' }] }} />
            </TouchableOpacity>
            {errors.district && <Text style={styles.errorText}>{errors.district}</Text>}
            {districtExpanded && (
              <View style={styles.dropdown}>
                {districtOptions.map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dropdownItem, d === district && styles.dropdownItemActive]}
                    onPress={() => handleSelectDistrict(d)}>
                    <Text style={[styles.dropdownText, d === district && styles.dropdownTextActive]}>
                      {d}
                    </Text>
                    {d === district && <CheckCircle size={16} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* 详细地址 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>详细地址</Text>
            <Input
              label="门牌号/楼栋/房间号"
              placeholder="如：3号楼2单元1501室"
              value={detail}
              onChangeText={setDetail}
              error={errors.detail}
              required
            />
          </View>

          {/* 地址标签 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>地址标签</Text>
            <View style={styles.tagRow}>
              {TAGS.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.tagChip, tag === t && styles.tagChipActive]}
                  onPress={() => setTag(tag === t ? '' : t)}>
                  <Text style={[styles.tagChipText, tag === t && styles.tagChipTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 默认地址 */}
          <View style={styles.section}>
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>设为默认地址</Text>
                <Text style={styles.switchHint}>下单时将默认使用此地址</Text>
              </View>
              <Switch
                value={isDefault}
                onValueChange={setIsDefault}
                trackColor={{ false: colors.divider, true: colors.primaryLight }}
                thumbColor={isDefault ? colors.primary : '#f4f3f4'}
              />
            </View>
          </View>

          {/* 底部按钮 */}
          <View style={styles.bottomBtn}>
            <Button
              title={isEdit ? '保存修改' : '保存地址'}
              onPress={handleSave}
              loading={saveMutation.isPending}
              fullWidth
              size="large"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// 辅助：城市下的区县映射
function getDistrictsForCity(city: string): string[] {
  const map: Record<string, string[]> = {
    '广州市': ['天河区', '越秀区', '海珠区', '白云区', '番禺区', '荔湾区'],
    '深圳市': ['南山区', '福田区', '罗湖区', '宝安区', '龙岗区', '龙华区'],
    '东莞市': ['莞城区', '南城区', '东城区', '万江区', '虎门镇', '长安镇'],
    '佛山市': ['禅城区', '南海区', '顺德区', '三水区', '高明区'],
    '珠海市': ['香洲区', '斗门区', '金湾区'],
    '惠州市': ['惠城区', '惠阳区', '博罗县', '惠东县', '龙门县'],
    '杭州市': ['西湖区', '上城区', '拱墅区', '滨江区', '余杭区', '萧山区'],
    '宁波市': ['海曙区', '鄞州区', '江北区', '北仑区', '镇海区', '奉化区'],
    '南京市': ['玄武区', '秦淮区', '建邺区', '鼓楼区', '栖霞区', '江宁区'],
    '苏州市': ['姑苏区', '虎丘区', '吴中区', '相城区', '吴江区', '工业园区'],
    '成都市': ['锦江区', '青羊区', '金牛区', '武侯区', '成华区', '高新区'],
    '武汉市': ['武昌区', '洪山区', '江岸区', '江汉区', '硚口区', '汉阳区'],
    '长沙市': ['岳麓区', '芙蓉区', '天心区', '开福区', '雨花区', '望城区'],
    '福州市': ['鼓楼区', '台江区', '仓山区', '晋安区', '马尾区', '长乐区'],
    '厦门市': ['思明区', '湖里区', '集美区', '海沧区', '同安区', '翔安区'],
    '济南市': ['历下区', '市中区', '槐荫区', '天桥区', '历城区', '长清区'],
    '青岛市': ['市南区', '市北区', '李沧区', '崂山区', '城阳区', '黄岛区'],
  };
  // 默认区县列表
  const defaultDistricts = ['市中心区', '东区', '西区', '南区', '北区'];
  return map[city] || defaultDistricts;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backBtn: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold as any,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  saveBtn: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold as any,
    color: colors.primary,
    padding: spacing.xs,
  },
  scrollView: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  section: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold as any,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  required: {
    color: colors.error,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: spacing.xs,
  },
  selectorDisabled: {
    opacity: 0.5,
    backgroundColor: colors.backgroundAlt,
  },
  selectorError: {
    borderColor: colors.error,
  },
  selectorText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing.xs,
  },
  dropdown: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: spacing.sm,
    ...shadow.md,
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  dropdownItemActive: {
    backgroundColor: colors.primaryBg,
  },
  dropdownText: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  dropdownTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold as any,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tagChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  tagChipActive: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  tagChipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  tagChipTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  switchHint: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    marginTop: 2,
  },
  bottomBtn: {
    paddingTop: spacing.sm,
  },
});
