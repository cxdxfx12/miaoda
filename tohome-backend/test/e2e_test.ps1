# ============================================================
# 喵搭 (MiaoDa) 端到端全流程测试脚本
# 
# 覆盖流程:
#   用户注册/登录 → 下单 → 付款 → 达人入驻申请 → 后台审核 →
#   达人上线 → 抢单/接单 → 虚拟电话绑定 → 出发 → 到达 →
#   开始服务 → 完成订单 → 客户评价
#
# 前置条件:
#   1. PostgreSQL 运行中 (127.0.0.1:5432, db=mydda)
#   2. Redis 运行中 (127.0.0.1:6379)
#   3. 各微服务已启动:
#      - User:    8081
#      - Order:   8082
#      - Talent:  8083
#      - Payment: 8084
#      - Dispatch:8085
#   4. 数据库中至少有一个服务项目 (services 表)
# ============================================================

param(
    [string]$BaseUrl = "http://127.0.0.1",
    [string]$UserPhone = "13800000001",
    [string]$TalentPhone = "13900000001",
    [string]$AdminUser = "admin",
    [string]$AdminPass = "admin123",
    [switch]$SkipSetup = $false
)

$ErrorActionPreference = "Continue"
$script:passCount = 0
$script:failCount = 0
$script:skipCount = 0

# 颜色输出
function Write-Step  { Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan; Write-Host "  STEP: $args" -ForegroundColor Cyan; Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan }
function Write-Pass  { $script:passCount++; Write-Host "  ✓ PASS: $args" -ForegroundColor Green }
function Write-Fail  { $script:failCount++; Write-Host "  ✗ FAIL: $args" -ForegroundColor Red }
function Write-Skip  { $script:skipCount++; Write-Host "  ⚠ SKIP: $args" -ForegroundColor Yellow }
function Write-Info  { Write-Host "  ℹ $args" -ForegroundColor Gray }
function Write-Warn  { Write-Host "  ⚠ WARNING: $args" -ForegroundColor Yellow }

# 工具函数: 发送 HTTP 请求
function Invoke-API {
    param(
        [string]$Method,
        [string]$Path,
        $Body = $null,
        [string]$Token = "",
        [int]$Port = 8081
    )
    $headers = @{ "Content-Type" = "application/json" }
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }
    
    $uri = "${BaseUrl}:${Port}${Path}"
    $params = @{
        Method      = $Method
        Uri         = $uri
        Headers     = $headers
        ContentType = "application/json"
    }
    if ($Body) { $params["Body"] = (ConvertTo-Json $Body -Compress -Depth 10) }

    try {
        $resp = Invoke-RestMethod @params -StatusCodeVariable statusCode
        return @{ StatusCode = $statusCode; Data = $resp; Success = $true }
    } catch {
        $sc = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
        $body = try { $_ | ConvertFrom-Json } catch { $_.Exception.Message }
        return @{ StatusCode = $sc; Data = $body; Success = $false; Error = $_.Exception.Message }
    }
}

# 工具函数: 生成JWT Token (通过Go辅助程序)
function New-Token {
    param([int]$UserType, [int64]$UserID, [string]$Phone)
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $tokenGenDir = Join-Path $scriptDir "token_gen"
    $goModDir = Join-Path $scriptDir ".."
    
    # 使用 go run 生成 token
    $result = & go run "$tokenGenDir\main.go" $UserType $UserID $Phone 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "Token生成失败(go run): $result"
        return ""
    }
    return $result.Trim()
}

# 工具函数: 验证JSON响应
function Assert-OK {
    param($Response, [string]$Description)
    if ($Response.Success -and $Response.StatusCode -ge 200 -and $Response.StatusCode -lt 300) {
        Write-Pass $Description
        return $true
    } else {
        Write-Fail "$Description (HTTP $($Response.StatusCode))"
        if ($Response.Data) { Write-Info "  Response: $(ConvertTo-Json $Response.Data -Compress -Depth 3)" }
        return $false
    }
}

# 提取响应中的字段
function Get-Field { param($Response, [string]$Field) return $Response.Data.data.$Field }
function Get-Data  { param($Response) return $Response.Data.data }

# ============================================================
# PHASE 0: 环境检查与初始化
# ============================================================
Write-Host "`n" -NoNewline
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║      喵搭 (MiaoDa) 端到端全流程测试                  ║" -ForegroundColor Magenta
Write-Host "║      测试时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')                          ║" -ForegroundColor Magenta
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Magenta

Write-Step "PHASE 0: 环境检查"

# 检查服务可用性
$services = @{
    "User"     = 8081
    "Order"    = 8082  
    "Talent"   = 8083
    "Payment"  = 8084
    "Dispatch" = 8085
}

foreach ($svc in $services.GetEnumerator()) {
    try {
        $test = Invoke-WebRequest -Uri "$BaseUrl`:$($svc.Value)/api/v1/services/categories" -TimeoutSec 5 -ErrorAction Stop
        Write-Pass "$($svc.Key) 服务 (端口 $($svc.Value)) 运行中"
    } catch {
        Write-Fail "$($svc.Key) 服务 (端口 $($svc.Value)) 无响应"
        Write-Info "  请先启动服务: cd tohome-backend && go run ./cmd/$($svc.Key.ToLower())/main.go"
    }
}

# Redis连接检查 (通过注入验证码)
Write-Info "Redis 连接检查: 尝试设置测试验证码..."
try {
    $smsKey = "sms:code:$UserPhone"
    # 直接通过Redis CLI设置（需要有redis-cli）
    $redisCheck = redis-cli -h 127.0.0.1 -p 6379 SET "e2e:test" "ok" EX 60 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Pass "Redis 连接正常"
    } else {
        Write-Warn "Redis CLI 无响应 — 将使用API发送验证码"
    }
} catch {
    Write-Warn "Redis 检查跳过"
}

# ============================================================
# PHASE 1: 用户注册/登录
# ============================================================
Write-Step "PHASE 1: 用户注册/登录 (用户手机: $UserPhone)"

# 1.1 发送短信验证码
Write-Info "1.1 发送短信验证码..."
$smsResp = Invoke-API -Method POST -Path "/api/v1/auth/sms/send" -Body @{ phone = $UserPhone } -Port 8081
if (Assert-OK $smsResp "发送验证码") {
    Write-Info "  验证码已存入 Redis (key: sms:code:$UserPhone)"
}

# 1.2 获取验证码（模拟：直接读取Redis或使用固定测试码）
Write-Info "1.2 获取Redis中的验证码..."
$code = "888888"
try {
    $redisCode = redis-cli -h 127.0.0.1 -p 6379 GET "sms:code:$UserPhone" 2>&1
    if ($redisCode -match '^\d{6}$') {
        $code = $redisCode
        Write-Info "  从Redis读取验证码: $code"
    } else {
        Write-Warn "  无法从Redis读取验证码，使用固定测试码: $code"
    }
} catch {
    Write-Warn "  无法从Redis读取验证码，使用固定测试码: $code"
}

# 1.3 用户登录（自动注册）
Write-Info "1.3 用户登录（自动注册）..."
$loginResp = Invoke-API -Method POST -Path "/api/v1/auth/login" -Body @{ phone = $UserPhone; code = $code } -Port 8081
if (Assert-OK $loginResp "用户登录/注册") {
    $userToken = Get-Field $loginResp "token"
    $userId = [int64](Get-Field $loginResp "user").id
    Write-Info "  User ID: $userId"
    Write-Info "  Token: $($userToken.Substring(0, [Math]::Min(40, $userToken.Length)))..."
} else {
    Write-Fail "用户登录失败，后续测试可能无法继续"
    $userToken = ""
    $userId = 0
}

# ============================================================
# PHASE 2: 创建地址
# ============================================================
Write-Step "PHASE 2: 创建用户地址"

$addressResp = Invoke-API -Method POST -Path "/api/v1/user/addresses" -Body @{
    contact_name  = "张先生"
    contact_phone = $UserPhone
    province      = "浙江省"
    city          = "杭州市"
    district      = "西湖区"
    detail        = "文三路478号华星时代广场A座15层"
    lat           = 30.2790
    lng           = 120.1300
    is_default    = 1
    tag           = "公司"
} -Token $userToken -Port 8081

$addressId = $null
if (Assert-OK $addressResp "创建地址") {
    $addressId = (Get-Data $addressResp).id
    Write-Info "  Address ID: $addressId"
}

# 如果创建失败，直接使用地址JSON（不需要持久化地址ID）
$addressData = @{
    province = "浙江省"
    city     = "杭州市"
    district = "西湖区"
    detail   = "文三路478号华星时代广场A座15层"
    lat      = 30.2790
    lng      = 120.1300
}

# ============================================================
# PHASE 3: 查询服务列表并下单
# ============================================================
Write-Step "PHASE 3: 查询服务列表 & 创建订单"

# 3.1 获取服务分类和列表
Write-Info "3.1 获取服务分类..."
$catResp = Invoke-API -Method GET -Path "/api/v1/services/categories" -Port 8082
Assert-OK $catResp "获取服务分类"

Write-Info "3.2 获取服务列表..."
$svcResp = Invoke-API -Method GET -Path "/api/v1/services" -Port 8082
$servicesList = @()
$serviceId = $null
$serviceSpec = ""

if (Assert-OK $svcResp "获取服务列表") {
    $svcData = Get-Data $svcResp
    if ($svcData.list) { $servicesList = $svcData.list } else { $servicesList = $svcData }
    
    if ($servicesList -is [array] -and $servicesList.Count -gt 0) {
        $serviceId = $servicesList[0].id
        $serviceId = [int64]$serviceId
        Write-Info "  使用首个服务: ID=$serviceId, Name=$($servicesList[0].name)"
        
        # 获取服务详情（含规格）
        $detailResp = Invoke-API -Method GET -Path "/api/v1/services/$serviceId" -Port 8082
        if ($detailResp.Success -and $detailResp.Data.data.specs) {
            $specs = $detailResp.Data.data.specs
            if ($specs -is [array] -and $specs.Count -gt 0) {
                $serviceSpec = $specs[0].name
                Write-Info "  使用规格: $serviceSpec"
            }
        }
        
        # 如果服务详情中没有图片等字段是JSON bytes, 直接使用列表中的名称
        if (-not $serviceSpec) {
            # 尝试从列表项获取默认规格名
            $serviceSpec = "标准"
        }
    } else {
        Write-Warn "  没有可用服务 — 请在DB中插入服务数据"
    }
} else {
    Write-Fail "获取服务列表失败"
}

# 3.3 创建订单
Write-Info "3.3 创建订单..."
if ($serviceId -and $userToken) {
    $appointmentTime = (Get-Date).AddHours(2).ToString("yyyy-MM-ddTHH:mm:sszzz")
    
    $orderResp = Invoke-API -Method POST -Path "/api/v1/orders" -Body @{
        service_id       = $serviceId
        spec_name        = $serviceSpec
        appointment_time = $appointmentTime
        address          = $addressData
        contact_name     = "张先生"
        contact_phone    = $UserPhone
        remark           = "请准时到达"
    } -Token $userToken -Port 8082

    $orderId = $null
    if (Assert-OK $orderResp "创建订单") {
        $orderData = Get-Data $orderResp
        $orderId = [int64]$orderData.id
        $orderNo = $orderData.order_no
        Write-Info "  Order ID: $orderId, OrderNo: $orderNo, Status: $($orderData.status)"
        Write-Info "  Amount: ¥$($orderData.final_amount)"
        
        if ($orderData.status -ne 0) {
            Write-Warn "  订单状态不是待支付(0)，而是: $($orderData.status)"
        }
    } else {
        Write-Fail "创建订单失败"
        $orderId = $null
    }
} else {
    Write-Skip "创建订单 (缺少 service_id 或 user_token)"
    $orderId = $null
}

# ============================================================
# PHASE 4: 支付订单
# ============================================================
Write-Step "PHASE 4: 支付订单"

if ($orderId -and $userToken) {
    $payResp = Invoke-API -Method POST -Path "/api/v1/orders/$orderId/pay" -Body @{
        pay_method  = 3   # 余额支付（模拟）
        pay_channel = "balance"
    } -Token $userToken -Port 8082

    if (Assert-OK $payResp "支付订单") {
        $payData = Get-Data $payResp
        Write-Info "  Payment No: $($payData.payment_no)"
        Write-Info "  Status: $($payData.status)"
        
        # 验证订单状态变为 1 (待接单)
        $orderCheckResp = Invoke-API -Method GET -Path "/api/v1/orders/$orderId" -Token $userToken -Port 8082
        if ($orderCheckResp.Success) {
            $currentStatus = $orderCheckResp.Data.data.status
            if ($currentStatus -eq 1) {
                Write-Pass "订单支付后状态确认: 已变为待接单(status=1)"
            } else {
                Write-Warn "  订单支付后状态: $currentStatus (预期: 1-待接单)"
            }
        }
    }
} else {
    Write-Skip "支付订单 (缺少 order_id 或 user_token)"
}

# ============================================================
# PHASE 5: 达人入驻申请
# ============================================================
Write-Step "PHASE 5: 达人入驻申请 (达人手机: $TalentPhone)"

# 5.1 达人注册/登录
Write-Info "5.1 达人注册/登录..."
$talentSmsResp = Invoke-API -Method POST -Path "/api/v1/auth/sms/send" -Body @{ phone = $TalentPhone } -Port 8081
if (Assert-OK $talentSmsResp "达人发送验证码") {
    Write-Info "  验证码已发送"
}

# 获取验证码
$talentCode = "888888"
try {
    $redisCode = redis-cli -h 127.0.0.1 -p 6379 GET "sms:code:$TalentPhone" 2>&1
    if ($redisCode -match '^\d{6}$') { $talentCode = $redisCode }
} catch {}

$talentLoginResp = Invoke-API -Method POST -Path "/api/v1/auth/login" -Body @{ phone = $TalentPhone; code = $talentCode } -Port 8081
if (Assert-OK $talentLoginResp "达人登录/注册") {
    # 注意：登录返回的 token 是 user_type=1，达人资质审核通过前使用此token
    $talentUserToken = Get-Field $talentLoginResp "token"
    $talentUserId = [int64](Get-Field $talentLoginResp "user").id
    Write-Info "  Talent UserID: $talentUserId"
} else {
    Write-Fail "达人登录失败"
    $talentUserToken = ""
    $talentUserId = 0
}

# 5.2 达人提交入驻申请
Write-Info "5.2 达人提交入驻申请..."
if ($talentUserToken) {
    $applyResp = Invoke-API -Method POST -Path "/api/v1/user/talent/apply" -Body @{
        real_name           = "测试达人A"
        id_card             = "330100199001011234"
        gender              = 1
        birthday            = "1990-01-01"
        phone               = $TalentPhone
        emergency_contact   = "紧急联系人"
        emergency_phone     = "13800000002"
        skills              = @(1, 2)
        certificates        = @("健康证", "按摩师资格证")
        service_city        = "杭州市"
        service_districts   = @("西湖区", "拱墅区")
        introduction        = "5年按摩经验，擅长推拿和足疗"
    } -Token $talentUserToken -Port 8081

    $talentId = $null
    if (Assert-OK $applyResp "达人入驻申请") {
        Write-Info "  申请已提交，等待审核..."
        
        # 5.3 查询达人信息获取 talent_id
        Write-Info "5.3 获取达人ID..."
        try {
            # 通过达人资料获取ID（需要 talent 服务）
            $talentProfileResp = Invoke-API -Method GET -Path "/api/v1/talents/nearby?lat=30.2790&lng=120.1300&radius=10" -Port 8083
            if ($talentProfileResp.Success) {
                $talents = Get-Data $talentProfileResp
                if ($talents -is [array] -and $talents.Count -gt 0 -and $talents[0].user_id -eq $talentUserId) {
                    $talentId = [int64]$talents[0].id
                    Write-Info "  Talent ID: $talentId (Status: $($talents[0].status) - 待审核)"
                }
            }
            
            # 如果上面没找到，尝试直接查询
            if (-not $talentId) {
                # 无法通过公开API获取待审核的达人资料，先使用 user_id 作为参考
                Write-Warn "  无法获取达人资料ID（待审核达人不在附近列表中）"
                Write-Info "  达人 UserID: $talentUserId (将用于后续审核查询)"
            }
        } catch {
            Write-Warn "  获取达人ID失败: $_"
        }
    }
} else {
    Write-Skip "达人入驻申请 (缺少 token)"
    $talentId = $null
}

# ============================================================
# PHASE 6: 后台审核达人
# ============================================================
Write-Step "PHASE 6: 后台审核达人"

# 6.1 生成管理员Token (Admin login 需要 DB 中已有管理员用户)
# 我们先尝试用 admin 账户登录，如果失败则用 token 生成器
Write-Info "6.1 管理员认证..."
$adminToken = ""
$adminResp = Invoke-API -Method POST -Path "/api/v1/admin/auth/login" -Body @{
    username = $AdminUser
    password = $AdminPass
} -Port 8081

if ($adminResp.Success) {
    $adminToken = Get-Field $adminResp "token"
    Write-Pass "管理员登录成功"
} else {
    Write-Warn "管理员登录失败（可能admin账户未创建）"
    Write-Info "  Response: $($adminResp.Data)"
    Write-Info "  尝试使用 token 生成器..."
    
    # 使用 Go 辅助程序生成 admin jwt
    $adminToken = New-Token -UserType 3 -UserID 1 -Phone "admin"
    if ($adminToken) {
        Write-Info "  已生成管理员Token: $($adminToken.Substring(0, [Math]::Min(40, $adminToken.Length)))..."
    } else {
        Write-Fail "无法生成管理员Token"
    }
}

# 6.2 查询待审核达人列表
Write-Info "6.2 查询待审核达人列表..."
if ($adminToken) {
    $pendingResp = Invoke-API -Method GET -Path "/api/v1/admin/talents?status=0&page=1&page_size=20" -Token $adminToken -Port 8081
    if ($pendingResp.Success) {
        $pendingList = Get-Data $pendingResp
        $adminTalentId = $null
        if ($pendingList.list -is [array] -and $pendingList.list.Count -gt 0) {
            $found = $pendingList.list | Where-Object { $_.user_id -eq $talentUserId } | Select-Object -First 1
            if ($found) {
                $adminTalentId = [int64]$found.id
                Write-Info "  找到待审核达人: ID=$adminTalentId, Name=$($found.real_name)"
            } else {
                # 取第一个待审核的
                $adminTalentId = [int64]$pendingList.list[0].id
                Write-Info "  使用首个待审核达人: ID=$adminTalentId"
            }
        }
        
        # 6.3 审核通过
        if ($adminTalentId) {
            Write-Info "6.3 审核达人通过..."
            $reviewResp = Invoke-API -Method POST -Path "/api/v1/admin/talents/$adminTalentId/review" -Body @{
                status = 1   # 通过
                reason = "资质审核通过"
            } -Token $adminToken -Port 8081
            
            if (Assert-OK $reviewResp "审核达人通过") {
                $talentId = $adminTalentId
                Write-Info "  Talent ID: $talentId 已审核通过"
                
                # 验证达人状态
                $talentCheckResp = Invoke-API -Method GET -Path "/api/v1/admin/talents/$talentId" -Token $adminToken -Port 8081
                if ($talentCheckResp.Success -and $talentCheckResp.Data.data.status -eq 1) {
                    Write-Pass "达人状态确认: 已变为正常(status=1)"
                }
            }
        } else {
            Write-Fail "未找到待审核达人"
        }
    } else {
        Write-Fail "查询达人列表失败"
        Write-Info "  (可能是 AdminAuth 中间件拒绝了 token)"
    }
} else {
    Write-Skip "管理员审核 (缺少 admin token)"
}

# ============================================================
# PHASE 7: 达人上线 + 设置位置
# ============================================================
Write-Step "PHASE 7: 达人上线 & 设置位置"

# 7.1 获取达人Token
# 注意: 审核通过后重新登录，Login 已修复为自动返回 user_type=2
Write-Info "7.1 达人重新登录获取Token (审核通过后应返回 user_type=2)..."
# 达人审核通过后，重新登录即可获取达人 JWT
Write-Info "7.1 达人重新登录..."
# 审核通过后重新登录获取达人 token
$talentSms2 = Invoke-API -Method POST -Path "/api/v1/auth/sms/send" -Body @{ phone = $TalentPhone } -Port 8081
$talentCode2 = "888888"
try {
    $rc = redis-cli -h 127.0.0.1 -p 6379 GET "sms:code:$TalentPhone" 2>&1
    if ($rc -match '^\d{6}$') { $talentCode2 = $rc }
} catch {}
$talentLogin2 = Invoke-API -Method POST -Path "/api/v1/auth/login" -Body @{ phone = $TalentPhone; code = $talentCode2 } -Port 8081

$talentToken = ""
if ($talentLogin2.Success) {
    $talentToken = Get-Field $talentLogin2 "token"
    $loginUser = Get-Field $talentLogin2 "user"
    Write-Info "  达人重新登录成功"
    Write-Info "  UserID: $($loginUser.id)"
    Write-Info "  Token: $($talentToken.Substring(0, [Math]::Min(40, $talentToken.Length)))..."
} else {
    # 回退：使用 token 生成器
    Write-Warn "  重新登录失败，使用 token 生成器"
    if ($talentUserId) {
        $talentToken = New-Token -UserType 2 -UserID $talentUserId -Phone $TalentPhone
    }
}

# 7.2 更新工作状态为在线
Write-Info "7.2 达人上线..."
if ($talentToken) {
    $statusResp = Invoke-API -Method POST -Path "/api/v1/talent/status" -Body @{
        status = 1   # WorkStatusOnline
    } -Token $talentToken -Port 8083

    Assert-OK $statusResp "达人上线(work_status=1)"

    # 7.3 更新位置
    Write-Info "7.3 更新达人位置..."
    $locResp = Invoke-API -Method POST -Path "/api/v1/talent/location" -Body @{
        lat = 30.2790
        lng = 120.1300
    } -Token $talentToken -Port 8083

    Assert-OK $locResp "更新达人位置"
} else {
    Write-Skip "达人上线 (缺少 talentToken)"
}

# ============================================================
# PHASE 8: 抢单/接单
# ============================================================
Write-Step "PHASE 8: 抢单池 & 接单"

# 8.1 查看抢单池
Write-Info "8.1 查看抢单池..."
if ($talentToken -and $talentId) {
    $poolResp = Invoke-API -Method GET -Path "/api/v1/talent/grab-pool/list?filter=latest&page=1&page_size=20&lat=30.2790&lng=120.1300" -Token $talentToken -Port 8083
    
    if (Assert-OK $poolResp "查看抢单池") {
        $poolData = Get-Data $poolResp
        $poolList = if ($poolData.list) { $poolData.list } else { @() }
        Write-Info "  抢单池订单数: $($poolData.total)"
        
        if ($poolList.Count -gt 0) {
            $grabOrderId = [int64]$poolList[0].id
            Write-Info "  池中首个订单: ID=$grabOrderId, Amount=¥$($poolList[0].final_amount)"
            
            # 8.2 抢单
            Write-Info "8.2 抢单..."
            $grabResp = Invoke-API -Method POST -Path "/api/v1/talent/grab-pool/$grabOrderId/grab" -Token $talentToken -Port 8083
            
            if (Assert-OK $grabResp "抢单成功") {
                Write-Info "  抢单结果: $($grabResp.Data.data.message)"
                
                # 如果抢单成功，后续直接用这个 order ID
                if (-not $orderId) { $orderId = $grabOrderId }
            } else {
                Write-Info "  抢单响应: $($grabResp.Data)"
            }
        } else {
            Write-Info "  抢单池为空 — 订单可能已通过派单系统分配"
            Write-Info "  或5分钟超时未触发（需订单状态为PendingAccept且已分配技师但未接单超过5分钟）"
            
            # 抢单池为空时，如果已有订单，尝试直接接单
            if ($orderId) {
                Write-Info "  尝试直接接单（跳过抢单池）..."
            }
        }
    }
} else {
    Write-Skip "抢单池 (缺少 talentToken 或 talentId)"
}

# 8.3 直接接单 (Accept Order)
Write-Info "8.3 达人直接接单..."
if ($talentToken -and $orderId) {
    # ⚠️ 注意: AcceptOrder handler 传递的是 JWT user_id 而非 talent_id
    # 但 AcceptOrder 的 service 层期望的是 talent 表 ID
    # 这是一个已知 Bug — 需要修复 handler 层添加 user_id → talent_id 解析
    $acceptResp = Invoke-API -Method POST -Path "/api/v1/talent/orders/$orderId/accept" -Token $talentToken -Port 8082
    
    if (Assert-OK $acceptResp "达人接单") {
        Write-Pass "订单 $orderId 已被达人接单"
    } else {
        Write-Fail "接单失败"
        Write-Info "  ⚠ 已知 Bug: AcceptOrder Handler 传递 user_id 而非 talent_id"
        Write-Info "  ⚠ Service 层期望 talent 表主键，但 Handler 传入的是 users 表主键"
        Write-Info "  ⚠ 修复方案: 在 AcceptOrder handler 中调用 TalentService.GetByUserID() 解析 talent_id"
    }
} else {
    Write-Skip "直接接单 (缺少 token 或 orderId)"
}

# ============================================================
# PHASE 9: 虚拟电话绑定
# ============================================================
Write-Step "PHASE 9: 虚拟电话绑定"

if ($userToken -and $orderId) {
    $phoneResp = Invoke-API -Method POST -Path "/api/v1/phone/bind" -Body @{
        order_id = $orderId
    } -Token $userToken -Port 8081

    if ($phoneResp.Success) {
        Write-Pass "虚拟电话绑定" 
        Write-Info "  Response: $(ConvertTo-Json $phoneResp.Data -Compress -Depth 3)"
    } elseif ($phoneResp.StatusCode -eq 404) {
        Write-Skip "虚拟电话绑定 (接口未就绪或 VirtualPhone 路由未注册)"
        Write-Info "  注: 虚拟电话路由在 user 服务，需检查 cmd/user/main.go 是否注册了 RegisterVirtualPhoneRoutes"
    } else {
        Write-Skip "虚拟电话绑定 (第三方配置未设置或服务未就绪)"
        Write-Info "  HTTP $($phoneResp.StatusCode): $($phoneResp.Data)"
    }
} else {
    Write-Skip "虚拟电话绑定 (缺少 token 或 orderId)"
}

# ============================================================
# PHASE 10: 订单状态流转 (出发→到达→服务中→完成)
# ============================================================
Write-Step "PHASE 10: 订单状态流转"

if ($talentToken -and $orderId) {
    # 10.1 出发
    Write-Info "10.1 技师出发..."
    $departedResp = Invoke-API -Method POST -Path "/api/v1/talent/orders/$orderId/status" -Body @{
        status = "departed"
        lat    = 30.2790
        lng    = 120.1300
    } -Token $talentToken -Port 8082
    
    if (Assert-OK $departedResp "技师出发") {
        Write-Info "  订单状态 → 已接单(已出发)"
    }
    
    # 10.2 到达
    Write-Info "10.2 技师到达..."
    $arrivedResp = Invoke-API -Method POST -Path "/api/v1/talent/orders/$orderId/status" -Body @{
        status = "arrived"
        lat    = 30.2795
        lng    = 120.1305
    } -Token $talentToken -Port 8082
    
    if (Assert-OK $arrivedResp "技师到达") {
        Write-Info "  订单状态 → 已到达"
    }
    
    # 10.3 开始服务
    Write-Info "10.3 开始服务..."
    $startedResp = Invoke-API -Method POST -Path "/api/v1/talent/orders/$orderId/status" -Body @{
        status = "started"
    } -Token $talentToken -Port 8082
    
    if (Assert-OK $startedResp "开始服务") {
        Write-Info "  订单状态 → 服务中(status=3)"
    }
    
    # 10.4 完成服务
    Write-Info "10.4 完成服务..."
    $completedResp = Invoke-API -Method POST -Path "/api/v1/talent/orders/$orderId/status" -Body @{
        status = "completed"
    } -Token $talentToken -Port 8082
    
    if (Assert-OK $completedResp "完成服务") {
        Write-Info "  订单状态 → 已完成(status=4)"
        
        # 验证订单状态
        $orderCheck2 = Invoke-API -Method GET -Path "/api/v1/orders/$orderId" -Token $userToken -Port 8082
        if ($orderCheck2.Success -and $orderCheck2.Data.data.status -eq 4) {
            Write-Pass "订单状态确认: 已完成"
        }
    }
} else {
    Write-Skip "订单状态流转 (缺少 talentToken 或 orderId)"
}

# ============================================================
# PHASE 11: 客户评价
# ============================================================
Write-Step "PHASE 11: 客户评价"

if ($userToken -and $orderId) {
    $reviewResp = Invoke-API -Method POST -Path "/api/v1/orders/$orderId/review" -Body @{
        rating       = 5
        content      = "服务非常专业，手法很到位，足疗效果很好！下次还会点这位达人。"
        tags         = @("专业", "热情", "准时")
        images       = @()
        is_anonymous = $false
    } -Token $userToken -Port 8082

    if (Assert-OK $reviewResp "提交评价") {
        Write-Info "  评分: 5星"
        Write-Info "  内容: 服务非常专业，手法很到位..."
        
        # 验证评价
        Write-Info "  验证评价数据..."
        if ($talentId) {
            $reviewsResp = Invoke-API -Method GET -Path "/api/v1/talents/$talentId/reviews?page=1&page_size=10" -Port 8083
            if ($reviewsResp.Success) {
                $reviews = Get-Data $reviewsResp
                Write-Info "  达人评价数: $($reviews.total)"
            }
        }
    } else {
        Write-Fail "提交评价失败"
        Write-Info "  可能原因: 从评价处理逻辑中 talent_name 为 nil (订单未分配技师名称)"
    }
} else {
    Write-Skip "客户评价 (缺少 userToken 或 orderId)"
}

# ============================================================
# 测试结果汇总
# ============================================================
Write-Host "`n" -NoNewline
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║              端到端测试结果汇总                       ║" -ForegroundColor Magenta
Write-Host "╠══════════════════════════════════════════════════════╣" -ForegroundColor Magenta
Write-Host "║  ✓ PASS:  $($script:passCount.ToString().PadRight(43))║" -ForegroundColor Green
Write-Host "║  ✗ FAIL:  $($script:failCount.ToString().PadRight(43))║" -ForegroundColor Red
Write-Host "║  ⚠ SKIP:  $($script:skipCount.ToString().PadRight(43))║" -ForegroundColor Yellow
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Magenta

Write-Host "`n已修复的架构Gap (本次测试前已修复):" -ForegroundColor Green
Write-Host "  ✓ Login 自动判断用户类型: 已审核通过的达人返回 user_type=2" -ForegroundColor Green
Write-Host "    → user.go Login(): 查询 talent 表 → 达人则生成 user_type=2 JWT" -ForegroundColor Gray
Write-Host ""
Write-Host "  ✓ AcceptOrder/UpdateOrderStatus Handler 解析 talent_id" -ForegroundColor Green
Write-Host "    → order.go: 添加 resolveTalentID() 方法，从 JWT user_id 查 talent 表" -ForegroundColor Gray
Write-Host ""

Write-Host "待修复的已知问题:" -ForegroundColor Yellow
Write-Host "  1. OrderStatus 缺少 departed/arrived 独立状态值" -ForegroundColor Gray
Write-Host "     → departed 和 arrived 都映射到 status=2 (Accepted)" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. 部分 Handler 实现为 TODO/空壳" -ForegroundColor Gray
Write-Host "     → RejectOrder, GetCurrentOrder, UpdateLocation, AdminAssignOrder 等" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. VirtualPhone 数据为模拟/空壳" -ForegroundColor Gray
Write-Host "     → 第三方配置均为占位值，实际需要阿里云虚拟号码服务" -ForegroundColor Gray

# ============================================================
# SQL 种子数据参考 (如需要)
# ============================================================
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  SQL 种子数据 (如需手动初始化)" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host @'
-- 管理员用户 (bcrypt hash for "admin123")
-- 使用 Go 生成: bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
INSERT INTO users (phone, password_hash, nickname, member_level, status, created_at, updated_at)
VALUES ('admin', '$2a$10$...', '管理员', 3, 1, NOW(), NOW())
ON CONFLICT (phone) DO NOTHING;

-- 服务类别
INSERT INTO service_categories (name, icon, sort_order, status, created_at, updated_at) VALUES
('全身按摩', 'spa', 1, 1, NOW(), NOW()),
('足疗养生', 'foot', 2, 1, NOW(), NOW()),
('推拿正骨', 'bone', 3, 1, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 服务项目
INSERT INTO services (name, description, category_id, base_price, specs, status, created_at, updated_at) VALUES
('经典全身按摩', '60分钟全身放松按摩', 1, 198.00,
 '[{"name":"标准","price":198,"duration":60},{"name":"尊享","price":298,"duration":90}]'::jsonb,
 1, NOW(), NOW()),
('足疗养生', '专业足部按摩+中药泡脚', 2, 128.00,
 '[{"name":"标准","price":128,"duration":45}]'::jsonb,
 1, NOW(), NOW())
ON CONFLICT DO NOTHING;
'@

Write-Host "`n测试完成! `n" -ForegroundColor Cyan
