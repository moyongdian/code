package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"xiaobaizuobishe-server/pkg/core"
	"xiaobaizuobishe-server/pkg/middleware"
	"xiaobaizuobishe-server/pkg/models"
)

type collectReq struct {
	BID          int    `json:"bid"`
	BusinessName string `json:"businessName"`
}

// CollectAdd 收藏：若已有记录则更新为收藏
func (a *App) CollectAdd(c *gin.Context) {
	var req collectReq
	if err := c.ShouldBindJSON(&req); err != nil {
		core.Fail(c, "参数错误")
		return
	}
	u := middleware.CurrentUser(c)
	if u == nil {
		core.Fail(c, "请先登录")
		return
	}
	var col models.Collect
	if err := a.DB.Where("bid = ? AND uid = ?", req.BID, u.ID).First(&col).Error; err == nil {
		col.IsCollect = 1
		col.Time = models.Now()
		a.DB.Save(&col)
	} else {
		col = models.Collect{
			BID: req.BID, UID: u.ID, BusinessName: req.BusinessName, IsCollect: 1, Time: models.Now(),
		}
		a.DB.Create(&col)
	}
	core.OK(c)
}

// CollectUpdate 取消收藏
func (a *App) CollectUpdate(c *gin.Context) {
	var req collectReq
	if err := c.ShouldBindJSON(&req); err != nil {
		core.Fail(c, "参数错误")
		return
	}
	u := middleware.CurrentUser(c)
	if u == nil {
		core.Fail(c, "请先登录")
		return
	}
	a.DB.Model(&models.Collect{}).Where("bid = ? AND uid = ?", req.BID, u.ID).
		Updates(map[string]interface{}{"is_collect": 0, "time": models.Now()})
	core.OK(c)
}

func (a *App) CollectDelete(c *gin.Context) {
	a.DB.Delete(&models.Collect{}, parseID(c))
	core.OK(c)
}

func (a *App) CollectDeleteBatch(c *gin.Context) {
	a.DB.Delete(&models.Collect{}, ids(c))
	core.OK(c)
}

func (a *App) CollectSelectAll(c *gin.Context) {
	var list []models.Collect
	a.DB.Order("id desc").Find(&list)
	core.OKData(c, list)
}

// CollectSelectByUid 查询某用户所有收藏中的商家（is_collect=1）
func (a *App) CollectSelectByUid(c *gin.Context) {
	uidStr, _ := strconv.Atoi(c.Param("uid"))
	var cols []models.Collect
	a.DB.Where("uid = ? AND is_collect = 1", uidStr).Order("id desc").Find(&cols)
	var bizIDs []int
	for _, c := range cols {
		bizIDs = append(bizIDs, c.BID)
	}
	var bizList []models.Business
	if len(bizIDs) > 0 {
		a.DB.Where("id IN ?", bizIDs).Find(&bizList)
	}
	a.fillBusinessNames(&bizList)
	core.OKData(c, bizList)
}

func (a *App) CollectSelectByUidBid(c *gin.Context) {
	uidStr, _ := strconv.Atoi(c.Param("uid"))
	bid, _ := strconv.Atoi(c.Param("bid"))
	var col models.Collect
	a.DB.Where("uid = ? AND bid = ?", uidStr, bid).First(&col)
	core.OKData(c, col)
}

func (a *App) CollectSelectByPage(c *gin.Context) {
	q := a.DB.Model(&models.Collect{})
	var list []models.Collect
	total := a.fillPage(c, q, nil, &list)
	core.OKPage(c, list, total)
}