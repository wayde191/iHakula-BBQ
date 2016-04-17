# encoding: utf-8
require 'sinatra/base'
require 'sinatra/config_file'
require 'sinatra/json'
require 'json'
require 'sinatra/cookies'

require_relative '../stores/ihakula_store'
require_relative '../log/log_formatter'
require_relative '../log/log_wrapper'
require_relative '../http/http_client_factory'
require_relative '../http/status_code'

include StatusCodes

class WeixinResource < Sinatra::Base

  helpers Sinatra::JSON
  register Sinatra::ConfigFile
  set :environments, %w{development test prod}
  set :views, File.expand_path(File.join(__FILE__, '../../views'))
  config_file '../../config.yml'
  use Rack::Session::Cookie, {secret: settings.session_secret}

  post '/weixin/event/center' do
    validate_request
    dispatch_request
  end

  get '/weixin/join/activity/:open_id/:activity_id' do
    slim :joinactivitypage, locals: {openId: params[:open_id], activityId: params[:activity_id]}
  end

  get '/weixin/user/draw/prize/:open_id/:activity_id' do
    validate_request
    json ihakula_store.draw_user_prize(params[:open_id], params[:activity_id])
  end

  get '/weixin/get/user/activity/status' do
    validate_request
    json get_user_activity_status
  end

  get '/weixin/get/coupon/:qrcode' do
    validate_request
    json ihakula_store.get_coupon(@params[:qrcode])
  end

  post '/weixin/use/coupon/:qrcode' do
    validate_request
    json ihakula_store.used_coupon(@params[:qrcode])
  end

  get '/weixin/activity' do
    validate_request
    slim :activitypage
  end

  get '/weixin/get/all/activities' do
    validate_request
    json ihakula_store.get_all_activities
  end

  # Testing only
  get '/weixin/get/token' do
    validate_request
    json get_access_token
  end

  get '/weixin/test/user/activity' do
    validate_request
    json user_activity_record
  end

  get '/weixin/text/get_user_activity_status' do
    validate_request
    json get_user_activity_status
  end

  private

  def get_user_activity_status
    open_id = @params[:open_id]
    activity_id = @params[:activity_id]

    res = {go_shake: 'no'}

    activity = ihakula_store.get_activity_by_id(activity_id)
    if activity == NOT_FOUND then
      res[:status] = ACTIVITY_NOT_FOUND
    else
      start_date = activity[:start_date]
      end_date = activity[:end_date]
      activity_status = get_activity_status(start_date, end_date)
      case activity_status
        when 'going'
          res[:status] = ACTIVITY_IS_GOING
          activity_record = user_activity_record
          unless activity_record.nil?
            res[:status] = ACTIVITY_HAS_JOINED
            user_activity_coupon = ihakula_store.get_user_activity_coupon(open_id, activity_id)
            res[:coupon] = user_activity_coupon unless user_activity_coupon == NOT_FOUND
          else
            res[:go_shake] = 'yes'
          end
        when 'coming'
          res[:status] = ACTIVITY_NOT_START
        else
          res[:status] = ACTIVITY_IS_OVER
      end
    end

    res
  end

  def user_activity_record
    open_id = @params[:open_id]
    activity_id = @params[:activity_id]

    ihakula_store.get_user_activity(open_id, activity_id)
  end

  def dispatch_request
    @access_token = get_access_token
    @request_xml = @params[:request_xml]
    @request_json = JSON.parse(Hash.from_xml(@request_xml).to_json)

    ihakula_store.insert_user_request(@request_json['xml']['FromUserName'], @request_xml);

    type = @request_json['xml']['MsgType']
    case type
      when 'event'
        msg_type_event_dispatcher
      when 'text'
        msg_type_text_dispatcher
    end
  end

  def msg_type_text_dispatcher
    command_hash = get_command_hash

    case command_hash[:key]
      when 'BBQ' || 'bbq' || '0'
        show_welcome_message
      when '1' #当前优惠活动
        show_all_activities
      when '2' #参加活动
        show_activity_link_page(command_hash[:value])
      when '3' #我的优惠券
        show_my_coupons
      when '4' #生成二维码
        create_qrcode(command_hash[:value])
      when '5' #最新消息
        show_latest_message
      else
        show_guide_service_list
    end
  end

  def show_guide_service_list
    @message = "呃...不大明白，或者您的问题真的难倒我了，
                要不您换个问法再试试，或许小北和球球就能明白啦！
                您也可以输入序号使用以下服务：\n
                [0]关于《BBQ北伴球》
                [1]当前优惠活动
                [2]'2:'+活动序号参加活动（如2:1）
                [3]我的优惠券
                [4]'4:'+优惠券序号生成二维码(如4:1)\n"
    @message = @message.gsub(/ /, '')
    get_response_xml_message_by_type('text')
  end

  def show_welcome_message
    about_us_json = get_template_about_us_item_json
    @article_items_arr = [about_us_json]
    get_response_xml_message_by_type('article')
  end

  def get_activity_status(start_date, end_date)
    current = Time.now
    if current.between?(start_date, end_date) then
      res = 'going'
    elsif current < start_date then
      res = 'coming'
    else
      res = 'gone'
    end

    res
  end

  def show_all_activities
    activities = ihakula_store.get_all_activities
    @message = "===============================\n"

    current_time = get_current_time
    activities.each do |activity|
      name = activity[:name]

      start_date = activity[:start_date]
      end_date = activity[:end_date]
      activity_status = get_activity_status(start_date, end_date)
      case activity_status
        when 'going'
          going_message = '活动正在进行中...'
        when 'coming'
          going_message = '活动还未开如，敬请期待！'
        else
          going_message = '活动已经结束，您可以看看其它活动！'
      end

      act_id = activity[:ID]
      activity_message = "
活动名称：#{name}
活动序号：#{act_id}
开始时间：#{start_date.strftime('%Y-%m-%d %H:%M:%S')}
结束时间：#{end_date.strftime('%Y-%m-%d %H:%M:%S')}
当前时间：#{current_time}\n
#{going_message}\n
===============================\n\n"

      @message += activity_message
    end

    get_response_xml_message_by_type('text')
  end

  def show_activity_link_page(activity_id)
    stripped_act_id = activity_id.strip
    if /^(\d*)$/ =~ stripped_act_id then
      response = ihakula_store.get_activity_by_id(stripped_act_id)
      if response == NOT_FOUND then
        @message = "您输入的活动序列号: #{stripped_act_id} 不存在，请确认并再次尝试。\n
                  您可输入：1 ，再次查看活动序列号 \n"
        get_response_xml_message_by_type('text')
      else
        from_user = @request_json['xml']['FromUserName']
        link_url = "http://www.ihakula.com:8090/weixin/join/activity/#{from_user}/#{activity_id}?ihakula_request=ihakula_northern_hemisphere";
        activity = response;
        activity_json =  {
            title: activity[:name],
            description: activity[:description],
            pic_url: activity[:pic_url],
            url: link_url
        }
        @article_items_arr = [activity_json]
        get_response_xml_message_by_type('article')

      end
    else
      @message = "您输入的活动序列号:#{stripped_act_id}，格式有误，因该为一串数字。\n
                  您可输入：1 ，再次查看活动序列号 \n"
      get_response_xml_message_by_type('text')
    end


  end

  def show_my_coupons
    coupons = ihakula_store.get_all_user_coupon(@request_json['xml']['FromUserName'])
    if coupons == NOT_FOUND then
      @message = "你还暂未获得任何优惠券。\n
                  您可输入：1 ，显示当前所有活动 \n"
    else
      @message = "===============================\n"
      coupons.each do |coupon|
        name = coupon[:name]
        cou_id = coupon[:ID]
        code = coupon[:code]
        end_date = coupon[:end_date]
        current_time = get_current_time
        used = coupon[:used] == 'yes' ? '已经使用' : '还未使用'
        activity_message = "
奖品名称：#{name}
奖品序号：#{cou_id}
奖品编码：#{code}
使用状态：#{used}
有效时间：#{end_date.strftime('%Y-%m-%d %H:%M:%S')}
当前时间：#{current_time}\n
===============================\n\n"

        @message += activity_message
      end
    end

    get_response_xml_message_by_type('text')
  end

  def create_qrcode(qrcode_id)
    coupon = ihakula_store.get_coupon_by_id(qrcode_id,@request_json['xml']['FromUserName'])

    if coupon == NOT_FOUND then
      @message = "你查询的优惠券不存在。\n
                  您可输入：3 ，查看我的优惠券 \n"
      get_response_xml_message_by_type('text')
    else
      coupon_info = coupon[:name] + ':' + coupon[:code] + ':' + coupon[:end_date].strftime('%Y-%m-%d %H:%M:%S') + ':' + coupon[:start_date].strftime('%Y-%m-%d %H:%M:%S')
      create_qrcode_json =  {
          title: '生成二维码',
          description: coupon[:code],
          pic_url: 'http://www.ihakula.com/bbq/wp-content/uploads/2015/08/QRCode-Featured.png',
          url: 'http://www.ihakula.com:8090/weixin/join/activity/ihakula_create_coupon/' +
              coupon_info + '?ihakula_request=ihakula_northern_hemisphere'
      }
      @article_items_arr = [create_qrcode_json]
      get_response_xml_message_by_type('article')
    end
  end

  def show_latest_message

  end

  def show_first_time_subscribe_welcome_message
    about_us_json = get_template_about_us_item_json
    from_user = @request_json['xml']['FromUserName']
    link_url = "http://www.ihakula.com:8090/weixin/join/activity/#{from_user}/1?ihakula_request=ihakula_northern_hemisphere";

    draw_prize_json =  {
        title: '试营业酬宾活动：抖抖手就能中奖',
        description: '摇摇就能中奖',
        pic_url: 'http://www.ihakula.com/bbq/wp-content/uploads/2015/07/shake_200200.png',
        url: link_url
    }
    @article_items_arr = [about_us_json, draw_prize_json]
    get_response_xml_message_by_type('article')
  end

  def get_template_about_us_item_json
    {
        title: '关于我们：BBQ北伴球',
        description: '您好，我们是小北和球球！很高兴能为您服务 ：) 。 为您提供优质的服务，是我们毕生的追求！',
        pic_url: 'http://www.ihakula.com/bbq/wp-content/uploads/2015/07/place_holder_360200.png',
        url: 'http://www.ihakula.com/bbq/?page_id=4'
    }
  end

  def get_template_welcome_message
    "您好，我们是小北和球球！很高兴能为您服务 ：）\n
    店名：北伴球
    主营：进口食品
    地址：武汉市江厦区高兴六路凤凰步行街7号楼底商
    主旨：为您提供优质的服务，是我们毕生的追求！\n
    回复'bbq'或'BBQ'可再次查看此信息
    回复'?'可显示服务菜单
    "
  end

  def msg_type_event_dispatcher
    event = @request_json['xml']['Event']
    case event
      when 'subscribe'
        msg_type_subscribe
      when 'SCAN'
        msg_type_scan
      else
        show_guide_service_list
    end
  end

  def msg_type_scan
    msg_type_subscribe
  end

  def msg_type_subscribe # Subscribe Event
    is_first_time = ihakula_store.user_first_time_subscribe(@request_json)
    ihakula_store.user_subscribe(@request_json)

    if is_first_time then
      show_first_time_subscribe_welcome_message
    else
      show_welcome_message
    end

  end

  def get_access_token
    token = session[:token]
    if token.nil? then
      token = refresh_access_token
    else
      url = "https://api.weixin.qq.com/cgi-bin/getcallbackip?access_token=#{token}"
      http_client = HttpClientFactory::create(settings)
      body_json = JSON.parse(http_client.get(url).body.to_json)
      if body_json['ip_list'].nil?
        token = refresh_access_token
      end
    end

    token
  end

  def refresh_access_token
    app_id = 'wx32c089c7ce016ab7'
    app_secret = 'b1c0c431cbcf9f35ba2b771b426eb7b5'
    url = "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=#{app_id}&secret=#{app_secret}"

    http_client = HttpClientFactory::create(settings)
    body_json = JSON.parse(http_client.get(url).body.to_json)

    session[:token] = body_json['access_token']
    session[:token]

  end

  def ihakula_store
    IhakulaStore.new(settings)
  end

  def write_request_details_to_log(action, request, request_parameters)
    @logger = LogWrapper.new(LogFormatter.new, settings)
    @logger.info_details(action, request, request_parameters, 'IhakulaResource')
  end

  def validate_request
    unless request_come_from_ihakula
      redirect '/'
    end
  end

  def request_come_from_ihakula
    params[:ihakula_request] == 'ihakula_northern_hemisphere'
  end

  def get_response_xml_message_by_type(message_type)
    case message_type
      when 'text'
        formatted_text_response_xml_message
      when 'article'
        formatted_article_response_xml_message
    end
  end

  def formatted_text_response_xml_message
    time = Time.now().nsec
    "
      <xml>
        <ToUserName><![CDATA[#{@request_json['xml']['FromUserName']}]]></ToUserName>
        <FromUserName><![CDATA[#{@request_json['xml']['ToUserName']}]]></FromUserName>
        <CreateTime>#{time}</CreateTime>
        <MsgType><![CDATA[text]]></MsgType>
        <Content><![CDATA[#{@message}]]></Content>
      </xml>
    "
  end

  def formatted_article_response_xml_message
    time = Time.now().nsec
    article_count = @article_items_arr.count
    article_items = get_article_items_xml
    "
      <xml>
        <ToUserName><![CDATA[#{@request_json['xml']['FromUserName']}]]></ToUserName>
        <FromUserName><![CDATA[#{@request_json['xml']['ToUserName']}]]></FromUserName>
        <CreateTime>#{time}</CreateTime>
        <MsgType><![CDATA[news]]></MsgType>
        <ArticleCount>#{article_count}</ArticleCount>
        <Articles>#{article_items}</Articles>
      </xml>
    "
  end

  def get_article_items_xml
    items_parsed_xml = '';
    @article_items_arr.each do |item|
      items_parsed_xml += "
      <item>
        <Title><![CDATA[#{item[:title]}]]></Title>
        <Description><![CDATA[#{item[:description]}]]></Description>
        <PicUrl><![CDATA[#{item[:pic_url]}]]></PicUrl>
        <Url><![CDATA[#{item[:url]}]]></Url>
      </item>
    "
    end
    items_parsed_xml
  end

  def get_command_hash
    @request_message = @request_json['xml']['Content']
    command_hash = {:key=>@request_message}

    if @request_message.length > 1 then
      @request_message.sub! '：',':'

      if /^2:/ =~ @request_message then
        command_hash = {:key=>'2', :value=>$'}
      elsif /^4:/ =~ @request_message then
        command_hash = {:key=>'4', :value=>$'}
      end
    end

    command_hash
  end

  def get_current_time
    Time.now.strftime('%Y-%m-%d %H:%M:%S')
  end


  # {
  #     title: '关于我们：BBQ北伴球',
  #     description: '您好，我们是小北和球球！很高兴能为您服务 ：) 。 为您提供优质的服务，是我们毕生的追求！',
  #     pic_url: 'http://www.ihakula.com/bbq/wp-content/uploads/2015/07/place_holder_360200.png',
  #     url: 'http://www.ihakula.com/bbq/?page_id=4'
  # }

#   <xml>
#   <ToUserName><![CDATA[toUser]]></ToUserName>
# <FromUserName><![CDATA[fromUser]]></ FromUserName>
#   <CreateTime>12345678</CreateTime>
# <MsgType><![CDATA[news]]></ MsgType>
#   <ArticleCount>2</ArticleCount>
# <Articles>
# <item>
# <Title><![CDATA[title1]]></ Title>
#   <Description><![CDATA[description1]]></Description>
# <PicUrl><![CDATA[picurl]]></ PicUrl>
#   <Url><![CDATA[url]]></Url>
# </i tem>
#   <item>
#   <Title><![CDATA[title]]></Title>
# <Description><![CDATA[description]]></ Description>
#   <PicUrl><![CDATA[picurl]]></PicUrl>
# <Url><![CDATA[url]]></ Url>
#   </item>
# </ Articles>
#   </xml>

#   <xml>
#   <ToUserName><![CDATA[toUser]]></ToUserName>
# <FromUserName><![CDATA[fromUser]]></FromUserName>
#   <CreateTime>12345678</CreateTime>
# <MsgType><![CDATA[text]]></MsgType>
#   <Content><![CDATA[你好]]></Content>
# </xml>

end
