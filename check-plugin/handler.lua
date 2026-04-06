local JwtCheckHandler = {
    PRIORITY = 1000,
    VERSION = "1.0.0",
}

function JwtCheckHandler:access(conf)
    local jwt_claims = ngx.ctx.authenticated_jwt_claims

    if not jwt_claims then
        return kong.response.exit(401, { message = "JWT authentication required" })
    end

    if not jwt_claims.subscription_active then
        return kong.response.exit(403, {
            message = "Active subscription required",
            code = "SUBSCRIPTION_INACTIVE"
        })
    end

    kong.service.request.set_header("x-user-id", jwt_claims.user_id or jwt_claims.sub or "")
    kong.service.request.set_header("x-user-email", jwt_claims.email or "")
    kong.service.request.set_header("x-subscription-active", "true")
    kong.service.request.clear_header("authorization")
end

return JwtCheckHandler