// 达人注册/入驻页面
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  User,
  IdentificationCard,
  GenderMale,
  Calendar,
  Phone,
  Heartbeat,
  MapPin,
  Wrench,
  Camera,
  NotePencil,
  CheckSquare,
} from 'phosphor-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { colors, spacing, fontSize, fontWeight, radius, shadow } from '../theme';
import { validatePhone, validateIdCard } from '../utils';

// 模拟省市区数据
const PROVINCES = ['北京市', '上海市', '广东省', '浙江省', '江苏省', '四川省'];
const CITIES: Record<string, string[]> = {
  '北京市': ['朝阳区', '海淀区', '丰台区', '东城区', '西城区'],
  '上海市': ['浦东新区', '徐汇区', '静安区', '黄浦区', '长宁区'],
  '广东省': ['深圳市', '广州市', '东莞市', '佛山市'],
  '浙江省': ['杭州市', '宁波市', '温州市'],
  '江苏省': ['南京市', '苏州市', '无锡市'],
  '四川省': ['成都市', '绵阳市'],
};
const DISTRICTS: Record<string, string[]> = {
  '深圳市': ['南山区', '福田区', '罗湖区', '宝安区', '龙岗区'],
  '广州市': ['天河区', '越秀区', '海珠区', '番禺区'],
  '杭州市': ['西湖区', '上城区', '拱墅区', '滨江区'],
  '成都市': ['武侯区', '锦江区', '青羊区', '金牛区'],
  '朝阳区': ['望京', '三里屯', '国贸', '大望路'],
  '海淀区': ['中关村', '五道口', '西二旗'],
};

const SKILL_TAGS = ['推拿按摩', '足疗保健', '精油SPA', '拔罐刮痧', '经络调理', '中式按摩', '泰式按摩', '运动康复'];

const SERVICE_AREAS = [
  '南山区', '福田区', '罗湖区', '宝安区', '龙岗区', '龙华区',
  '天河区', '越秀区', '海珠区', '番禺区',
  '朝阳区', '海淀区', '丰台区',
];

export const TalentRegisterScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // 个人信息
  const [realName, setRealName] = useState('');
  const [idCard, setIdCard] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // 服务信息
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [intro, setIntro] = useState('');
  const [agreed, setAgreed] = useState(false);

  // 资质证书
  const [certificates, setCertificates] = useState<string[]>([]);

  const [showProvincePicker, setShowProvincePicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const toggleArea = (area: string) => {
    setSelectedAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  const handleSelectProvince = (p: string) => {
    setProvince(p);
    setCity('');
    setDistrict('');
    setShowProvincePicker(false);
  };

  const handleSelectCity = (c: string) => {
    setCity(c);
    setDistrict('');
    setShowCityPicker(false);
  };

  const handleSelectDistrict = (d: string) => {
    setDistrict(d);
    setShowDistrictPicker(false);
  };

  const handleAddCertificate = () => {
    // 模拟添加证书
    Alert.alert('上传证书', '请选择证书图片（模拟功能）', [
      { text: '拍照', onPress: () => setCertificates(prev => [...prev, 'cert_' + Date.now()]) },
      { text: '从相册选择', onPress: () => setCertificates(prev => [...prev, 'cert_' + Date.now()]) },
      { text: '取消', style: 'cancel' },
    ]);
  };

  const validateStep0 = (): boolean => {
    if (!realName.trim()) { Alert.alert('提示', '请输入真实姓名'); return false; }
    if (!validateIdCard(idCard)) { Alert.alert('提示', '请输入正确的身份证号'); return false; }
    if (!birthDate) { Alert.alert('提示', '请选择出生日期'); return false; }
    if (!validatePhone(phone)) { Alert.alert('提示', '请输入正确的联系电话'); return false; }
    if (!emergencyName.trim()) { Alert.alert('提示', '请输入紧急联系人姓名'); return false; }
    if (!emergencyRelation.trim()) { Alert.alert('提示', '请输入与联系人的关系'); return false; }
    if (!validatePhone(emergencyPhone)) { Alert.alert('提示', '请输入正确的紧急联系人电话'); return false; }
    return true;
  };

  const validateStep1 = (): boolean => {
    if (!province || !city || !district) { Alert.alert('提示', '请选择服务城市'); return false; }
    if (selectedAreas.length === 0) { Alert.alert('提示', '请选择服务区域'); return false; }
    if (selectedSkills.length === 0) { Alert.alert('提示', '请选择擅长技能'); return false; }
    return true;
  };

  const handleNext = () => {
    if (step === 0) {
      if (validateStep0()) setStep(1);
    } else if (step === 1) {
      if (validateStep1()) setStep(2);
    }
  };

  const handleSubmit = async () => {
    if (!agreed) {
      Alert.alert('提示', '请先阅读并同意服务协议');
      return;
    }
    setLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1500));
      setLoading(false);
      navigation.navigate('RegisterSuccess');
    } catch (e: any) {
      setLoading(false);
      Alert.alert('提交失败', e.message || '请稍后重试');
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {['个人信息', '服务信息', '资质认证'].map((label, idx) => (
        <React.Fragment key={idx}>
          <View style={styles.stepItem}>
            <View style={[styles.stepDot, step >= idx && styles.stepDotActive]}>
              <Text style={[styles.stepDotText, step >= idx && styles.stepDotTextActive]}>
                {idx + 1}
              </Text>
            </View>
            <Text style={[styles.stepLabel, step >= idx && styles.stepLabelActive]}>
              {label}
            </Text>
          </View>
          {idx < 2 && <View style={[styles.stepLine, step > idx && styles.stepLineActive]} />}
        </React.Fragment>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        {/* 顶部导航 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => (step > 0 ? setStep(step - 1) : navigation.goBack())}>
            <Text style={styles.backText}>{step > 0 ? '上一步' : '返回'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>达人入驻</Text>
          <View style={{ width: 60 }} />
        </View>

        {renderStepIndicator()}

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>

          {/* 步骤0：个人信息 */}
          {step === 0 && (
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>基本信息</Text>
              <Input
                label="真实姓名"
                placeholder="请输入真实姓名"
                value={realName}
                onChangeText={setRealName}
                leftIcon={<User size={20} color={colors.textTertiary} />}
                required
              />
              <Input
                label="身份证号"
                placeholder="请输入18位身份证号"
                value={idCard}
                onChangeText={setIdCard}
                maxLength={18}
                leftIcon={<IdentificationCard size={20} color={colors.textTertiary} />}
                required
              />
              <View style={styles.row}>
                <Input
                  label="性别"
                  containerStyle={{ flex: 1, marginRight: spacing.sm }}
                  editable={false}
                  value={gender === 'male' ? '男' : '女'}
                  leftIcon={<GenderMale size={20} color={colors.textTertiary} />}
                  required
                />
                <TouchableOpacity
                  style={[styles.genderBtn, gender === 'male' && styles.genderBtnActive]}
                  onPress={() => setGender('male')}>
                  <Text style={[styles.genderBtnText, gender === 'male' && styles.genderBtnTextActive]}>男</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderBtn, gender === 'female' && styles.genderBtnActive]}
                  onPress={() => setGender('female')}>
                  <Text style={[styles.genderBtnText, gender === 'female' && styles.genderBtnTextActive]}>女</Text>
                </TouchableOpacity>
              </View>
              <Input
                label="出生日期"
                placeholder="请选择出生日期（如 1990-01-01）"
                value={birthDate}
                onChangeText={setBirthDate}
                maxLength={10}
                leftIcon={<Calendar size={20} color={colors.textTertiary} />}
                required
              />
              <Input
                label="联系电话"
                placeholder="请输入手机号"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={11}
                leftIcon={<Phone size={20} color={colors.textTertiary} />}
                required
              />

              <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>紧急联系人</Text>
              <Input
                label="联系人姓名"
                placeholder="请输入紧急联系人姓名"
                value={emergencyName}
                onChangeText={setEmergencyName}
                leftIcon={<User size={20} color={colors.textTertiary} />}
                required
              />
              <Input
                label="与联系人关系"
                placeholder="如：配偶、父母、兄弟姐妹"
                value={emergencyRelation}
                onChangeText={setEmergencyRelation}
                leftIcon={<Heartbeat size={20} color={colors.textTertiary} />}
                required
              />
              <Input
                label="联系人电话"
                placeholder="请输入紧急联系人电话"
                value={emergencyPhone}
                onChangeText={setEmergencyPhone}
                keyboardType="phone-pad"
                maxLength={11}
                leftIcon={<Phone size={20} color={colors.textTertiary} />}
                required
              />
            </View>
          )}

          {/* 步骤1：服务信息 */}
          {step === 1 && (
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>服务城市</Text>

              {/* 省份选择 */}
              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => setShowProvincePicker(!showProvincePicker)}>
                <MapPin size={20} color={colors.textTertiary} />
                <Text style={[styles.pickerText, !province && styles.pickerPlaceholder]}>
                  {province || '请选择省份'}
                </Text>
                <Text style={styles.required}>*</Text>
              </TouchableOpacity>
              {showProvincePicker && (
                <View style={styles.pickerList}>
                  {PROVINCES.map(p => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.pickerItem, province === p && styles.pickerItemActive]}
                      onPress={() => handleSelectProvince(p)}>
                      <Text style={[styles.pickerItemText, province === p && styles.pickerItemTextActive]}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* 城市选择 */}
              {province && (
                <TouchableOpacity
                  style={styles.pickerBtn}
                  onPress={() => setShowCityPicker(!showCityPicker)}>
                  <MapPin size={20} color={colors.textTertiary} />
                  <Text style={[styles.pickerText, !city && styles.pickerPlaceholder]}>
                    {city || '请选择城市'}
                  </Text>
                  <Text style={styles.required}>*</Text>
                </TouchableOpacity>
              )}
              {showCityPicker && province && (CITIES[province] || []).map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.pickerItem, city === c && styles.pickerItemActive]}
                  onPress={() => handleSelectCity(c)}>
                  <Text style={[styles.pickerItemText, city === c && styles.pickerItemTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}

              {/* 区县选择 */}
              {city && (
                <TouchableOpacity
                  style={styles.pickerBtn}
                  onPress={() => setShowDistrictPicker(!showDistrictPicker)}>
                  <MapPin size={20} color={colors.textTertiary} />
                  <Text style={[styles.pickerText, !district && styles.pickerPlaceholder]}>
                    {district || '请选择区县'}
                  </Text>
                  <Text style={styles.required}>*</Text>
                </TouchableOpacity>
              )}
              {showDistrictPicker && city && (DISTRICTS[city] || []).map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.pickerItem, district === d && styles.pickerItemActive]}
                  onPress={() => handleSelectDistrict(d)}>
                  <Text style={[styles.pickerItemText, district === d && styles.pickerItemTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}

              {/* 服务区域多选 */}
              <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>服务区域（可多选）<Text style={styles.required}>*</Text></Text>
              <View style={styles.tagGrid}>
                {SERVICE_AREAS.map(area => (
                  <TouchableOpacity
                    key={area}
                    style={[styles.tag, selectedAreas.includes(area) && styles.tagActive]}
                    onPress={() => toggleArea(area)}>
                    <Text style={[styles.tagText, selectedAreas.includes(area) && styles.tagTextActive]}>
                      {area}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 擅长技能多选 */}
              <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>擅长技能（可多选）<Text style={styles.required}>*</Text></Text>
              <View style={styles.tagGrid}>
                {SKILL_TAGS.map(skill => (
                  <TouchableOpacity
                    key={skill}
                    style={[styles.tag, selectedSkills.includes(skill) && styles.tagActive]}
                    onPress={() => toggleSkill(skill)}>
                    <Text style={[styles.tagText, selectedSkills.includes(skill) && styles.tagTextActive]}>
                      {skill}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* 步骤2：资质认证 + 自我介绍 */}
          {step === 2 && (
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>资质证书</Text>
              <Text style={styles.sectionHint}>上传相关资格证书，有助于提升您的可信度</Text>

              <View style={styles.certGrid}>
                {certificates.map((cert, idx) => (
                  <View key={idx} style={styles.certCard}>
                    <Text style={styles.certText}>证书 {idx + 1}</Text>
                    <TouchableOpacity
                      onPress={() => setCertificates(prev => prev.filter((_, i) => i !== idx))}>
                      <Text style={styles.certRemove}>删除</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.certAddBtn} onPress={handleAddCertificate}>
                  <Camera size={28} color={colors.primary} />
                  <Text style={styles.certAddText}>上传证书</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>自我介绍</Text>
              <View style={styles.textAreaContainer}>
                <NotePencil size={20} color={colors.textTertiary} style={styles.textAreaIcon} />
                <View style={styles.textAreaWrap}>
                  <ScrollView
                    style={styles.textArea}
                    nestedScrollEnabled>
                    <Input
                      placeholder="请简单介绍一下您的专业技能和服务经验（200字以内）"
                      value={intro}
                      onChangeText={setIntro}
                      maxLength={200}
                      multiline
                      containerStyle={styles.textAreaInput}
                      style={{ height: 120, textAlignVertical: 'top' }}
                    />
                  </ScrollView>
                </View>
              </View>
              <Text style={styles.charCount}>{intro.length}/200</Text>

              {/* 协议勾选 */}
              <TouchableOpacity
                style={styles.agreementRow}
                onPress={() => setAgreed(!agreed)}>
                <CheckSquare
                  size={22}
                  color={agreed ? colors.primary : colors.textTertiary}
                  weight={agreed ? 'fill' : 'regular'}
                />
                <Text style={styles.agreementText}>
                  我已阅读并同意 <Text style={styles.agreementLink}>《喵搭服务协议》</Text>和<Text style={styles.agreementLink}>《隐私政策》</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* 底部按钮 */}
        <View style={styles.footer}>
          {step < 2 ? (
            <Button title="下一步" type="primary" fullWidth size="large" onPress={handleNext} />
          ) : (
            <Button
              title="提交入驻申请"
              type="primary"
              fullWidth
              size="large"
              onPress={handleSubmit}
              loading={loading}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backText: { fontSize: fontSize.base, color: colors.primary },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  stepItem: { alignItems: 'center' },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  stepDotActive: { backgroundColor: colors.primary },
  stepDotText: { fontSize: fontSize.sm, color: colors.textTertiary, fontWeight: fontWeight.bold },
  stepDotTextActive: { color: '#fff' },
  stepLabel: { fontSize: fontSize.sm, color: colors.textTertiary },
  stepLabelActive: { color: colors.primary, fontWeight: fontWeight.medium },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.divider, marginBottom: 20, marginHorizontal: spacing.sm },
  stepLineActive: { backgroundColor: colors.primary },
  scrollContent: { padding: spacing.md, paddingBottom: 100 },
  formSection: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  sectionHint: { fontSize: fontSize.sm, color: colors.textTertiary, marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  genderBtn: {
    height: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
    marginBottom: spacing.md,
  },
  genderBtnActive: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  genderBtnText: { fontSize: fontSize.base, color: colors.textSecondary },
  genderBtnTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: spacing.sm,
  },
  pickerText: { flex: 1, fontSize: fontSize.base, color: colors.textPrimary, marginLeft: spacing.sm },
  pickerPlaceholder: { color: colors.textTertiary },
  pickerList: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  pickerItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  pickerItemActive: { backgroundColor: colors.primaryBg },
  pickerItemText: { fontSize: fontSize.base, color: colors.textPrimary },
  pickerItemTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  tagActive: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  tagText: { fontSize: fontSize.sm, color: colors.textSecondary },
  tagTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  certGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  certCard: {
    width: 100,
    height: 100,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  certText: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs },
  certRemove: { fontSize: fontSize.xs, color: colors.error },
  certAddBtn: {
    width: 100,
    height: 100,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  certAddText: { fontSize: fontSize.sm, color: colors.primary, marginTop: spacing.xs },
  textAreaContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  textAreaIcon: { marginTop: spacing.md, marginRight: spacing.sm },
  textAreaWrap: { flex: 1 },
  textArea: { maxHeight: 140 },
  textAreaInput: { marginBottom: 0 },
  charCount: { fontSize: fontSize.sm, color: colors.textTertiary, textAlign: 'right', marginTop: spacing.xs },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
  },
  agreementText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, marginLeft: spacing.sm, lineHeight: 20 },
  agreementLink: { color: colors.primary },
  footer: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  required: { color: colors.error },
});
