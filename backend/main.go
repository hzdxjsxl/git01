package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Teacher struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Subjects []int  `json:"subjects"`
}

type Classroom struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Capacity int    `json:"capacity"`
}

type Course struct {
	ID           int    `json:"id"`
	Name         string `json:"name"`
	TeacherID    int    `json:"teacherId"`
	ClassroomID  int    `json:"classroomId"`
	Students     int    `json:"students"`
	HoursPerWeek int    `json:"hoursPerWeek"`
}

type DataResponse struct {
	Teachers   []Teacher   `json:"teachers"`
	Classrooms []Classroom `json:"classrooms"`
	Courses    []Course    `json:"courses"`
}

func main() {
	r := gin.Default()

	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusOK)
			return
		}
		c.Next()
	})

	r.GET("/api/data", func(c *gin.Context) {
		teachers := []Teacher{
			{ID: 1, Name: "张老师", Subjects: []int{1, 2}},
			{ID: 2, Name: "李老师", Subjects: []int{2, 3}},
			{ID: 3, Name: "王老师", Subjects: []int{1, 4}},
			{ID: 4, Name: "赵老师", Subjects: []int{3, 5}},
			{ID: 5, Name: "刘老师", Subjects: []int{4, 5}},
		}

		classrooms := []Classroom{
			{ID: 1, Name: "A101", Capacity: 30},
			{ID: 2, Name: "A102", Capacity: 40},
			{ID: 3, Name: "B201", Capacity: 50},
			{ID: 4, Name: "B202", Capacity: 35},
			{ID: 5, Name: "实验室1", Capacity: 25},
		}

		courses := []Course{
			{ID: 1, Name: "高等数学", TeacherID: 1, ClassroomID: 1, Students: 28, HoursPerWeek: 4},
			{ID: 2, Name: "线性代数", TeacherID: 1, ClassroomID: 2, Students: 35, HoursPerWeek: 3},
			{ID: 3, Name: "概率论", TeacherID: 2, ClassroomID: 1, Students: 25, HoursPerWeek: 3},
			{ID: 4, Name: "数据结构", TeacherID: 3, ClassroomID: 3, Students: 45, HoursPerWeek: 4},
			{ID: 5, Name: "操作系统", TeacherID: 3, ClassroomID: 2, Students: 30, HoursPerWeek: 3},
			{ID: 6, Name: "计算机网络", TeacherID: 4, ClassroomID: 4, Students: 32, HoursPerWeek: 3},
			{ID: 7, Name: "数据库原理", TeacherID: 4, ClassroomID: 5, Students: 22, HoursPerWeek: 3},
			{ID: 8, Name: "Java程序设计", TeacherID: 5, ClassroomID: 3, Students: 40, HoursPerWeek: 4},
			{ID: 9, Name: "Python编程", TeacherID: 5, ClassroomID: 5, Students: 20, HoursPerWeek: 3},
			{ID: 10, Name: "算法分析", TeacherID: 2, ClassroomID: 4, Students: 30, HoursPerWeek: 2},
		}

		c.JSON(http.StatusOK, DataResponse{
			Teachers:   teachers,
			Classrooms: classrooms,
			Courses:    courses,
		})
	})

	r.Run(":8080")
}
