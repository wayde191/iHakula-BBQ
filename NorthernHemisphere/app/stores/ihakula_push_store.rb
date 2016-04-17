require 'JPush'

require_relative '../exceptions/ihakula_service_error'
require_relative '../database/ihakula_db'
require_relative '../log/log_formatter'
require_relative '../log/log_wrapper'
require_relative '../http/status_code'

include StatusCodes

class IhakulaPushStore

  def initialize(settings)
    @settings = settings
    @logger = LogWrapper.new(LogFormatter.new, settings)
    @app_key = '4fc145a5f1955ca4b874901f'
    @master_secret = 'fba631e068ecde1ff44e162f'
  end

  def get_audience(parameters)
    if parameters[:audience] == 'all'
      JPush::Audience.all
    else
      JPush::Audience.build(_alias: parameters[:_alias])
    end
  end

  def push_message(parameters)
    begin
      client = JPush::JPushClient.new(@app_key, @master_secret)

      payload = JPush::PushPayload.build(
          platform: JPush::Platform.all,
          notification: JPush::Notification.build(
              alert: parameters[:message],
              ios: JPush::IOSNotification.build(
                  alert: parameters[:message],
                  title: parameters[:message],
                  badge: '+1',
                  sound: 'happy',
                  extras: {'order_number' => parameters[:order_number]})),
          message: JPush::Message.build(
              msg_content: parameters[:message_content],
              title: parameters[:message_title],
              content_type: 'text/plain',
              extras: {'order_number' => parameters[:order_number]}),
          audience: get_audience(parameters),
          options:JPush::Options.build(
              sendno: 1,
              apns_production: true))

      result = client.sendPush(payload)

      goods_hash = Hash.new
      goods_hash['code'] = '0'
      goods_hash['message'] = result.toJSON

      @logger.error_details(result.toJSON, 'push_message', 'message', 'IhakulaStore')

      goods_hash
    rescue StandardError => ex
      write_exception_details_to_log(ex, 'get_goods', 'paras')
      raise IhakulaServiceError
    end
  end

  private

  def write_exception_details_to_log(exception, request, request_parameters)
    puts exception.message
    @logger.error_details(exception.message, request, request_parameters, 'IhakulaStore')
  end

end
