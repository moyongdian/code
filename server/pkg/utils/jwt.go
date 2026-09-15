package utils

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims JWT 载荷
type Claims struct {
	UserID int    `json:"uid"`
	Role   string `json:"role"`
	Version int   `json:"ver"`
	jwt.RegisteredClaims
}

// GenerateToken 签发 JWT（HS256）
func GenerateToken(userID int, role string, version int, secret string, expireHours int) (string, error) {
	claims := Claims{
		UserID: userID,
		Role:   role,
		Version: version,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(expireHours) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// ParseToken 解析并校验 JWT
func ParseToken(tokenStr, secret string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}
	return nil, jwt.ErrTokenInvalidClaims
}