local JwtCheckHandler = {
    PRIORITY = 1000,
    VERSION = "1.0.0",
}

function JwtCheckHandler:access(conf)
    local jwt_claims = ngx.ctx.authenticated_jwt_claims

    if not jwt_claims then
        return kong.response.exit(401, { message = "JWT authentication required" })
    end

    kong.service.request.set_header("X-User-ID", jwt_claims.user_id or jwt_claims.sub or "")
end

return JwtCheckHandler