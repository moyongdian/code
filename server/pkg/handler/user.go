package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"xiaobaizuobishe-server/pkg/core"
	"xiaobaizuobishe-server/pkg/middleware"
	"xiaobaizuobishe-server/pkg/models"
	"xiaobaizuobishe-server/pkg/utils"
)

// ============ 通用用户逻辑（user/admin 共用）============

func (a *App) userAdd(c *gin.Context, role string) {
	var u models.User
	if err := c.ShouldBindJSON(&u); err != nil {
		core.Fail(c, "参数错误")
		return
	}
	if u.Username == "" {
		core.Fail(c, "用户名不能为空")
		return
	}
	var count int64
	a.DB.Model(&models.User{}).Where("username = ?", u.Username).Count(&count)
	if count > 0 {
		core.Fail(c, "插入数据库错误：用户名已存在")
		return
	}
	pwd, err := utils.HashPassword(u.Password)
	if err != nil {
		core.Fail(c, "密码处理失败")
		return
	}
	u.Password = pwd
	u.Role = role
	u.TokenVersion = 1
	if u.Name == "" {
		u.Name = u.Username
	}
	if err := a.DB.Create(&u).Error; err != nil {
		core.Fail(c, "插入数据库错误")
		return
	}
	middleware.SetOp(c, mapRoleOp(role), "新增")
	core.OK(c)
}

func (a *App) userUpdate(c *gin.Context) {
	var u models.User
	if err := c.ShouldBindJSON(&u); err != nil {
		core.Fail(c, "参数错误")
		return
	}
	if u.ID == 0 {
		core.Fail(c, "缺少主键")
		return
	}
	pwd, err := hashed(u.Password)
	if err != nil {
		core.Fail(c, "密码处理失败")
		return
	}
	// 仅当请求确实携带了密码时才更新 password 列。
	// 否则空字符串会被写入 password 字段，导致用户密码被清空、无法再登录。
	passwordProvided := pwd != ""
	u.Password = pwd
	// 密码变更时令牌版本 +1，旧 token 失效
	var old models.User
	if passwordProvided && a.DB.First(&old, u.ID).Error == nil && old.Password != pwd {
		u.TokenVersion = old.TokenVersion + 1
	}
	cols := []string{"username", "name", "phone", "email", "address", "avatar", "role", "sex"}
	if passwordProvided {
		cols = append(cols, "password", "token_version")
	}
	if err := a.DB.Model(&models.User{}).Select(cols).Where("id = ?", u.ID).Updates(&u).Error; err != nil {
		core.Fail(c, "更新失败")
		return
	}
	middleware.SetOp(c, "用户", "修改")
	core.OKData(c, u)
}

func (a *App) userDelete(c *gin.Context) {
	id := parseID(c)
	if id == uid(c) {
		core.Fail(c, "不能删除当前登录账号")
		return
	}
	if err := a.DB.Delete(&models.User{}, id).Error; err != nil {
		core.Fail(c, "删除失败")
		return
	}
	middleware.SetOp(c, "用户", "删除")
	core.OK(c)
}

func (a *App) userDeleteBatch(c *gin.Context) {
	list := ids(c)
	for _, id := range list {
		if id == uid(c) {
			core.Fail(c, "批量删除中包含当前登录账号，已取消")
			return
		}
	}
	if err := a.DB.Delete(&models.User{}, list).Error; err != nil {
		core.Fail(c, "批量删除失败")
		return
	}
	middleware.SetOp(c, "用户", "批量删除")
	core.OK(c)
}

func (a *App) userSelectAll(c *gin.Context, role string) {
	var list []models.User
	q := a.DB.Where("role = ?", role).Order("id desc")
	if err := q.Find(&list).Error; err != nil {
		core.Fail(c, "查询失败")
		return
	}
	core.OKData(c, list)
}

func (a *App) userSelectByPage(c *gin.Context, role string) {
	q := a.DB.Model(&models.User{}).Where("role = ?", role)
	if v := c.Query("username"); v != "" {
		q = q.Where("username like ?", "%"+v+"%")
	}
	if v := c.Query("name"); v != "" {
		q = q.Where("name like ?", "%"+v+"%")
	}
	var list []models.User
	total := a.fillPage(c, q, nil, &list)
	core.OKPage(c, list, total)
}

func (a *App) userExport(c *gin.Context, role string) {
	q := a.DB.Model(&models.User{}).Where("role = ?", role)
	if v := c.Query("username"); v != "" {
		q = q.Where("username like ?", "%"+v+"%")
	}
	if v := c.Query("name"); v != "" {
		q = q.Where("name like ?", "%"+v+"%")
	}
	if v := c.Query("ids"); v != "" {
		q = q.Where("id in ?", parseCSV(v))
	}
	var list []models.User
	if err := q.Order("id").Find(&list).Error; err != nil {
		core.Fail(c, "查询失败")
		return
	}
	headers := []string{"ID", "用户名", "姓名", "手机号", "邮箱", "地址", "角色"}
	var rows [][]interface{}
	for _, u := range list {
		rows = append(rows, []interface{}{u.ID, u.Username, u.Name, u.Phone, u.Email, u.Address, u.Role})
	}
	buf, err := utils.ExportToExcel(headers, rows)
	if err != nil {
		core.Fail(c, "导出失败")
		return
	}
	downloadExcel(c, buf)
}

func (a *App) userImport(c *gin.Context, role string) {
	file, err := c.FormFile("file")
	if err != nil {
		core.Fail(c, "请选择 Excel 文件")
		return
	}
	f, err := file.Open()
	if err != nil {
		core.Fail(c, "读取文件失败")
		return
	}
	defer f.Close()
	data := make([]byte, file.Size)
	_, _ = f.Read(data)
	rows, err := utils.ReadExcelRows(data)
	if err != nil {
		core.Fail(c, err.Error())
		return
	}
	success, fail := 0, 0
	for i, row := range rows {
		if i == 0 || normalizedEmpty(row) {
			continue // 跳过表头/空行
		}
		// 列：用户名、密码、姓名、手机号、邮箱、地址
		if len(row) < 2 || row[0] == "" {
			fail++
			continue
		}
		pwd, _ := utils.HashPasswordOrDefault(row[1], "123456")
		u := models.User{
			Username: row[0], Password: pwd, Name: cell(row, 2, row[0]),
			Phone: cell(row, 3, ""), Email: cell(row, 4, ""), Address: cell(row, 5, ""),
			Role: role, TokenVersion: 1,
		}
		u.Name = defaultName(u.Name, u.Username)
		if err := a.DB.Create(&u).Error; err != nil {
			fail++
		} else {
			success++
		}
	}
	middleware.SetOp(c, mapRoleOp(role), "新增")
	core.OKData(c, gin.H{"success": success, "fail": fail})
}

// ============ user 路由绑定 ============

func (a *App) UserAdd(c *gin.Context)         { a.userAdd(c, "用户") }
func (a *App) UserUpdate(c *gin.Context)      { a.userUpdate(c) }
func (a *App) UserDelete(c *gin.Context)      { a.userDelete(c) }
func (a *App) UserDeleteBatch(c *gin.Context) { a.userDeleteBatch(c) }
func (a *App) UserSelectAll(c *gin.Context)   { a.userSelectAll(c, "用户") }
func (a *App) UserSelectById(c *gin.Context) {
	var u models.User
	if err := a.DB.First(&u, parseID(c)).Error; err != nil {
		core.Fail(c, "查询失败")
		return
	}
	core.OKData(c, u)
}
func (a *App) UserSelectByPage(c *gin.Context) { a.userSelectByPage(c, "用户") }
func (a *App) UserExport(c *gin.Context)       { a.userExport(c, "用户") }
func (a *App) UserImport(c *gin.Context)       { a.userImport(c, "用户") }

// UpdatePassword 独立改密接口（移动端 editPassword）
func (a *App) UpdatePassword(c *gin.Context) {
	var req struct {
		ID       int    `json:"id"`
		Password string `json:"password"` // 新密码
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.ID == 0 || req.Password == "" {
		core.Fail(c, "参数错误")
		return
	}
	pwd, _ := utils.HashPassword(req.Password)
	u := models.User{ID: req.ID, Password: pwd, TokenVersion: 1}
	// 令牌版本基于旧值自增
	var old models.User
	if a.DB.First(&old, req.ID).Error == nil {
		u.TokenVersion = old.TokenVersion + 1
	}
	if err := a.DB.Model(&models.User{}).Select("password", "token_version").Where("id = ?", req.ID).Updates(&u).Error; err != nil {
		core.Fail(c, "修改失败")
		return
	}
	middleware.SetOp(c, "用户", "修改")
	// 返回新的用户信息供前端更新缓存
	var fresh models.User
	a.DB.First(&fresh, req.ID)
	fresh.Token, _ = utils.GenerateToken(fresh.ID, fresh.Role, fresh.TokenVersion, a.Cfg.JWT.Secret, a.Cfg.JWT.ExpireHours)
	core.OKData(c, fresh)
}

// ============ admin 路由绑定 ============

func (a *App) AdminAdd(c *gin.Context)         { a.userAdd(c, "管理员") }
func (a *App) AdminUpdate(c *gin.Context)      { a.userUpdate(c) }
func (a *App) AdminDelete(c *gin.Context)      { a.userDelete(c) }
func (a *App) AdminDeleteBatch(c *gin.Context) { a.userDeleteBatch(c) }
func (a *App) AdminSelectAll(c *gin.Context)   { a.userSelectAll(c, "管理员") }
func (a *App) AdminSelectById(c *gin.Context) {
	var u models.User
	if err := a.DB.First(&u, parseID(c)).Error; err != nil {
		core.Fail(c, "查询失败")
		return
	}
	core.OKData(c, u)
}
func (a *App) AdminSelectByPage(c *gin.Context) { a.userSelectByPage(c, "管理员") }
func (a *App) AdminExport(c *gin.Context)       { a.userExport(c, "管理员") }
func (a *App) AdminImport(c *gin.Context)       { a.userImport(c, "管理员") }

// ============ 辅助 ============

func mapRoleOp(role string) string {
	if role == "管理员" {
		return "管理员"
	}
	return "用户"
}

func parseCSV(s string) []int {
	var out []int
	for _, p := range strings.Split(s, ",") {
		if n, err := strconv.Atoi(strings.TrimSpace(p)); err == nil {
			out = append(out, n)
		}
	}
	return out
}

func cell(row []string, idx int, def string) string {
	if idx < len(row) {
		return row[idx]
	}
	return def
}

func defaultName(name, username string) string {
	if name == "" || name == " " {
		return username
	}
	return name
}

func normalizedEmpty(row []string) bool {
	for _, v := range row {
		if v != "" {
			return false
		}
	}
	return true
}

func downloadExcel(c *gin.Context, buf []byte) {
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename=export.xlsx")
	c.Data(http.StatusOK, "application/octet-stream", buf)
}