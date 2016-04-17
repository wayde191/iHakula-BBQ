require_relative 'http_client'
require_relative '../log/log_formatter'
require_relative '../log/log_wrapper'

class HttpClientFactory
  def self.create(settings)
    log_wrapper = LogWrapper.new(LogFormatter.new, settings)
    HTTPClient.new(log_wrapper)
  end
end