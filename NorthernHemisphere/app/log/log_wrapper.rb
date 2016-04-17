require 'logger'

class LogWrapper
  def initialize(log_formatter, settings, logger = Logger.new(settings.log_directory))
    @log_formatter = log_formatter
    @logger = logger
  end

  def error_details(message, path, data, headers)
    error_message = @log_formatter.format_error_details(message, path, data, headers)
    @logger.error error_message
  end

  def info_details(message, path, data, headers)
    info_message = @log_formatter.format_info_details(message, path, data, headers)
    @logger.info info_message
  end


end