class LogFormatter

  def format_error_details(message, request, request_parameters, headers)
    short_message = message[0 .. 500]
    "request: [#{request}] #{format_request_parameters(request_parameters)} headers: [#{headers}] error message: [#{short_message}]"
  end

  def format_info_details(message, request, request_parameters, headers)
    short_message = message[0 .. 500]
    "request: [#{request}] #{format_request_parameters(request_parameters)} headers: [#{headers}] info message: [#{short_message} #{format_request_header(request)}]"
  end

  private
  def format_request_parameters(request_parameters)
    request_parameters ? "request parameters: [#{request_parameters}]" : ''
  end

  def format_request_header(request)
    request ? "from ip:#{request.ip}; url = #{request.url} ; path = #{request.path}" : ''
  end

end