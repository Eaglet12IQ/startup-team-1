package core_http_request

import (
	"encoding/json"
	"fmt"
	"net/http"

	core_errors "auth-service/internal/core/errors"

	"github.com/go-playground/validator/v10"
)

var requestValidator = validator.New()

func DecodeAndValidateRequest(r *http.Request, dest any) error {
	if err := json.NewDecoder(r.Body).Decode(dest); err != nil {
		return fmt.Errorf(
			"decode json: %w",
			core_errors.ErrInvalidArgument,
		)
	}

	if err := requestValidator.Struct(dest); err != nil {
		return fmt.Errorf(
			"request validation: %w",
			core_errors.ErrInvalidArgument,
		)
	}

	return nil
}
