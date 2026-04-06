local JwtCheckHandler = {
    PRIORITY = 1100,
    VERSION = "1.0.0",
}

local jwt = require "resty.jwt"

function JwtCheckHandler:access(conf)
    local auth_header = ngx.req.get_headers()["authorization"]
    if not auth_header then
        kong.response.exit(401, { message = "Authorization header missing" })
    end

    local token = string.gsub(auth_header, "^Bearer%s+", "")
    kong.log.inspect("Raw access token:", token)

    local jwt_obj = jwt:verify("secret", token) 
    if not jwt_obj["verified"] then
        kong.response.exit(401, { message = "Invalid JWT token" })
    end

    local claims = jwt_obj["payload"]
    kong.log.inspect("Parsed claims:", claims)

    local user_id = claims.user_id or claims.sub or ""
    
    kong.service.request.set_header("X-User-ID", user_id)
    kong.response.set_header("X-Debug-User-ID", user_id)
end

return JwtCheckHandler