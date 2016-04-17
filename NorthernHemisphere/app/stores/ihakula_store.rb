# encoding: utf-8

require 'json'
require 'digest/md5'
require 'perfect-random-number-generator'

require_relative 'ihakula_push_store'
require_relative '../exceptions/ihakula_service_error'
require_relative '../database/ihakula_db'
require_relative '../log/log_formatter'
require_relative '../log/log_wrapper'
require_relative '../http/status_code'

include StatusCodes

class IhakulaStore

  def initialize(settings)
    @settings = settings
    @logger = LogWrapper.new(LogFormatter.new, settings)
    @ihakula_push_store = IhakulaPushStore.new(settings)

    @MAGIC = []
    29.downto(0) {|i| @MAGIC << 839712541[i]}
  end

  def get_user(user_id)
    Ih_users.find(user_id)
  end

  def get_order_detail(parameters)
    begin
      order = Ih_nh_order.where(ID: parameters[:order_id], user_id: parameters[:user_id])

      orders_hash = Hash.new
      orders_hash['code'] = '0'
      orders_hash['order'] = order
      orders_hash['customer'] = get_user(parameters[:user_id])
      orders_hash['customer_contact'] = Ih_nh_contact.find_by(user_id: parameters[:user_id])

      orders_hash
    rescue StandardError => ex
      write_exception_details_to_log(ex, 'get_order_detail', 'paras')
      raise IhakulaServiceError
    end
  end

  def all_in_progress_orders
    begin
      orders = Ih_nh_order.where('state < ?', 5).order('start_date DESC')

      orders_hash = Hash.new
      orders_hash['code'] = '0'
      orders_hash['orders'] = orders

      orders_hash
    rescue StandardError => ex
      write_exception_details_to_log(ex, 'in_progress_orders', 'paras')
      raise IhakulaServiceError
    end
  end

  def in_progress_orders(parameters)
    begin
      user_id = parameters[:user_id]
      orders = Ih_nh_order.where(user_id: user_id).where.not(state: [6, 7]).order('start_date DESC')

      orders_hash = Hash.new
      orders_hash['code'] = '0'
      orders_hash['orders'] = orders

      orders_hash
    rescue StandardError => ex
      write_exception_details_to_log(ex, 'in_progress_orders', 'paras')
      raise IhakulaServiceError
    end
  end

  def all_finished_orders
    begin
      orders = Ih_nh_order.where('state > ?', 4).order('start_date DESC')

      orders_hash = Hash.new
      orders_hash['code'] = '0'
      orders_hash['orders'] = orders

      orders_hash
    rescue StandardError => ex
      write_exception_details_to_log(ex, 'finished_orders', 'paras')
      raise IhakulaServiceError
    end
  end

  def finished_orders(parameters)
    begin
      user_id = parameters[:user_id]
      orders = Ih_nh_order.where(user_id: user_id, state: [6, 7]).order('start_date DESC')

      orders_hash = Hash.new
      orders_hash['code'] = '0'
      orders_hash['orders'] = orders

      orders_hash
    rescue StandardError => ex
      write_exception_details_to_log(ex, 'finished_orders', 'paras')
      raise IhakulaServiceError
    end
  end

  def insert_order(parameters)
    begin
      count = Ih_nh_order.count
      order_number = get_order_number_by_id(count)
      Ih_nh_order.create(
          order_number: order_number,
          user_id: parameters[:user_id],
          foods: parameters[:foods],
          price: parameters[:price],
          real_price: parameters[:real_price],
          state: parameters[:state],
          start_date: get_current_time
      )

      goods_hash = Hash.new
      goods_hash['code'] = '0'
      goods_hash['order_number'] = order_number

      goods_hash
    rescue StandardError => ex
      write_exception_details_to_log(ex, 'get_goods', 'paras')
      raise IhakulaServiceError
    end
  end

  def user_upload_contact(parameters)
    begin
      contact = Ih_nh_contact.find_by(user_id: parameters[:user_id])
      if contact.nil? then
        Ih_nh_contact.create(
            name: parameters[:contact_name],
            phone: parameters[:contact_phone],
            address: parameters[:contact_address],
            user_id: parameters[:user_id],
            date: get_current_time
        )
      else
        contact[:name] = parameters[:contact_name]
        contact[:phone] = parameters[:contact_phone]
        contact[:address] = parameters[:contact_address]
        contact[:date] = get_current_time
        contact.save
      end

      goods_hash = Hash.new
      goods_hash['code'] = '0'

      goods_hash
    rescue StandardError => ex
      write_exception_details_to_log(ex, 'user_upload_contact', 'paras')
      raise IhakulaServiceError
    end
  end

  def user_get_contact(parameters)
    begin
      contact = Ih_nh_contact.find_by(user_id: parameters[:user_id])

      goods_hash = Hash.new
      goods_hash['code'] = '0'
      goods_hash['contact'] = contact.nil? ? [] : [contact]

      goods_hash
    rescue StandardError => ex
      write_exception_details_to_log(ex, 'user_get_contact', 'paras')
      raise IhakulaServiceError
    end
  end

  def order_accepted(parameters)
    begin
      order = Ih_nh_order.find_by(user_id:parameters[:user_id], order_number: parameters[:order_number])
      order[:confirm_date] = get_current_time
      order[:state] = 2
      order.save

      goods_hash = Hash.new
      goods_hash['code'] = '0'
      goods_hash['order_number'] = parameters[:order_number]

      goods_hash
    rescue StandardError => ex
      write_exception_details_to_log(ex, 'order_accepted', 'paras')
      raise IhakulaServiceError
    end
  end

  def order_delivery(parameters)
    begin
      order = Ih_nh_order.find_by(user_id:parameters[:user_id], order_number: parameters[:order_number])
      order[:delivery_date] = get_current_time
      order[:state] = 3
      order.save

      goods_hash = Hash.new
      goods_hash['code'] = '0'
      goods_hash['order_number'] = parameters[:order_number]

      goods_hash
    rescue StandardError => ex
      write_exception_details_to_log(ex, 'order_accepted', 'paras')
      raise IhakulaServiceError
    end
  end

  def order_paid(parameters)
    begin
      order = Ih_nh_order.find_by(user_id:parameters[:user_id], order_number: parameters[:order_number])
      order[:pay_date] = get_current_time
      order[:state] = 4
      order.save

      goods_hash = Hash.new
      goods_hash['code'] = '0'
      goods_hash['order_number'] = parameters[:order_number]

      goods_hash
    rescue StandardError => ex
      write_exception_details_to_log(ex, 'order_accepted', 'paras')
      raise IhakulaServiceError
    end
  end

  def order_finished(parameters)
    begin
      order = Ih_nh_order.find_by(user_id:parameters[:user_id], order_number: parameters[:order_number])
      order[:end_date] = get_current_time
      order[:state] = 5
      order.save

      goods_hash = Hash.new
      goods_hash['code'] = '0'
      goods_hash['order_number'] = parameters[:order_number]

      goods_hash
    rescue StandardError => ex
      write_exception_details_to_log(ex, 'order_accepted', 'paras')
      raise IhakulaServiceError
    end
  end

  def cancel_order(parameters)
    begin
      order = Ih_nh_order.find_by(user_id:parameters[:user_id], ID: parameters[:order_id])
      order[:cancel_date] = get_current_time
      order[:state] = 6
      order.save

      goods_hash = Hash.new
      goods_hash['code'] = '0'

      goods_hash
    rescue StandardError => ex
      write_exception_details_to_log(ex, 'cancel_order', 'paras')
      raise IhakulaServiceError
    end
  end

  def push_notification(parameters)
    order_state = parameters[:order_state]
    user_id = parameters[:user_id]
    order_num = parameters[:order_number]

    audience_type = get_audience_type_by_order_state(order_state)
    message_info = get_message_by_order_state(order_state, order_num)
    user_alias = get_alias_by_order_state(order_state, user_id)

    push_message(
        {
            order_number: order_num,
            message: message_info,
            alias: user_alias,
            audience: audience_type
        }
    )
  end

  def push_message(message_obj)
    message_hash = {
        order_number: message_obj[:order_number],
        message: message_obj[:message],
        _alias: message_obj[:alias],
        audience: message_obj[:audience],
        message_content: message_obj[:message],
        message_title: message_obj[:message]
    }

    @ihakula_push_store.push_message(message_hash)
  end

  def get_goods
    begin
      types = Ih_nh_goods_type.where.not(type_id: [1, 14, 15, 17, 20]).to_a
      new_product_recommend = types.pop()
      office_recommend = types.pop()
      types.insert(0, office_recommend)
      types.insert(0, new_product_recommend)

      goods = Ih_nh_goods.where.not(type_id: [1, 14, 15, 17, 20]).where.not(image_url: nil).order('ranking ASC')
      recommends = Ih_nh_goods.where.not(type_id: [1, 14, 15, 17, 20]).where(recommend: 1)
      recommends.each do |recommend|
        recommend[:type_id] = 99
      end
      goods += recommends
      new_recommends = Ih_nh_goods.where.not(type_id: [1, 14, 15, 17, 20]).where(new_product: 'yes')
      new_recommends.each do |recommend|
        recommend[:type_id] = 100
      end
      goods += new_recommends

      goods_hash = Hash.new
      goods_hash['type'] = types
      goods_hash['good'] = goods
      goods_hash['code'] = '0'

      goods_hash
    rescue StandardError => ex
      write_exception_details_to_log(ex, 'get_goods', 'paras')
      raise IhakulaServiceError
    end
  end

  def get_all_accounts
    begin
      Ih_products.find(1).description
    rescue StandardError => ex
      write_exception_details_to_log(ex, 'get_all_accounts', 'paras')
      raise IhakulaServiceError
    end
  end

  def get_all_sale_records(group_id)
    begin
      group = get_group(group_id)
      group_users = group.members
      group_users_detail_info = get_group_users_detail_info(group_users)
      group_users_records = get_group_users_records(group_users)

      account_field = get_account_field()
      account_field_detail = get_account_field_detail()

      all_sale_records_hash = Hash.new
      all_sale_records_hash['users'] = group_users;
      all_sale_records_hash['users_detail_info'] = group_users_detail_info
      all_sale_records_hash['users_sale_records'] = group_users_records
      all_sale_records_hash['account_field'] = account_field
      all_sale_records_hash['account_field_detail'] = account_field_detail

      all_sale_records_hash
    rescue StandardError => ex
      write_exception_details_to_log(ex, 'get_all_sale_records', 'paras')
      raise IhakulaServiceError
    end
  end

  def login(username, password)
    begin
      users = Ih_users.where(user_email: username, user_pass: Digest::MD5.hexdigest(password))
      users[0]
    rescue StandardError => ex
      write_exception_details_to_log(ex, 'get_all_accounts', 'paras')
      raise IhakulaServiceError
    end
  end

  # Northern Hemisphere Weixin
  def get_all_user_coupon(open_id)
    Ih_nh_qrcode.where(open_id:open_id)
  rescue ActiveRecord::RecordNotFound
    NOT_FOUND
  end

  def get_coupon(qrcode)
    qrcode = Ih_nh_qrcode.find_by(code:qrcode)
    if qrcode.nil? then
      {status:NOT_FOUND}
    else
      coupon_used_date = qrcode[:used_date].nil?;
      if coupon_used_date.nil?

      end
      res = {
          status: OK,
          name: qrcode[:name],
          code: qrcode[:code],
          used: qrcode[:used],
          end_date: qrcode[:end_date].strftime('%Y-%m-%d %H:%M:%S'),
          used_date: qrcode[:used_date] == nil ? '00-00-00 00:00:00' : qrcode[:used_date].strftime('%Y-%m-%d %H:%M:%S'),
          activity_type: qrcode[:activity_type],
          discount: qrcode[:discount],
          denomination: qrcode[:denomination],
          expire: 'no'
      }

      end_date = qrcode[:end_date]
      current = Time.now
      if current >= end_date then
        res[:expire] = 'yes'
      end

      res
    end
  rescue ActiveRecord::RecordNotFound
    {status:NOT_FOUND}
  end

  def used_coupon(qrcode)
    qrcode = Ih_nh_qrcode.find_by(code:qrcode)
    if qrcode.nil? then
      {status:NOT_FOUND}
    else
      res = {status:OK}

      end_date = qrcode[:end_date]
      current = Time.now
      if current >= end_date then
        res[:status] = COUPON_EXPIRED
      elsif qrcode[:used] == 'yes' then
        res[:status] = COUPON_USED
      else
        qrcode[:used] = 'yes'
        qrcode[:used_date] = get_current_time
        qrcode.save
      end

      res
    end
  rescue ActiveRecord::RecordNotFound
    {status:NOT_FOUND}
  end

  def get_coupon_by_id(qr_id, open_id)
    Ih_nh_qrcode.find_by(open_id:open_id, ID:qr_id)
  rescue ActiveRecord::RecordNotFound
    NOT_FOUND
  end

  def get_user_activity_coupon(open_id, activity_id)
    Ih_nh_qrcode.find_by(open_id:open_id, activity_id:activity_id)
  rescue ActiveRecord::RecordNotFound
    NOT_FOUND
  end

  def get_user_activity(open_id, activity_id)
     Ih_nh_user_activity.find_by(open_id:open_id, activity_id:activity_id)
  rescue ActiveRecord::RecordNotFound
    NOT_FOUND
  end

  def get_all_activities
    Ih_nh_activities.all
  end

  def get_activity_by_id(activity_id)
    Ih_nh_activities.find(activity_id)
  rescue ActiveRecord::RecordNotFound
    NOT_FOUND
  end

  def insert_user_request(from_user, request_xml)
    Ih_nh_requests.create(from_user_name: from_user, content: request_xml, date: get_current_time)
  end

  def user_first_time_subscribe(request_json)
    is_first_time = false
    user = Ih_nh_user.find_by(open_id: request_json['xml']['FromUserName'])
    if user.nil?
      is_first_time = true
    end

    is_first_time
  end

  def user_subscribe(request_json)
    user = Ih_nh_user.find_by(open_id: request_json['xml']['FromUserName'])
    if user.nil? then
      open_id = request_json['xml']['FromUserName']
      Ih_nh_user.create(open_id: open_id,
                        subscribe_date: get_current_time,
                        unsubscribe_date: '0000-00-00 00:00:00',
                        subscribe_times: 1
      )
      # user_join_activity(open_id, 1)
    else
      sub_times = user[:subscribe_times]
      sub_times = sub_times + 1
      user[:subscribe_times] = sub_times
      user[:subscribe_date] = get_current_time
      user.save

    end
  end

  def draw_user_prize(open_id, activity_id)
    res = {}

    activity = get_activity_by_id(activity_id)
    user_activity = get_user_activity(open_id, activity_id)
    unless user_activity.nil?
      res[:status] = ACTIVITY_HAS_JOINED
      user_activity_coupon = get_user_activity_coupon(open_id, activity_id)
      res[:coupon] = user_activity_coupon unless user_activity_coupon == NOT_FOUND
    else
      activity_rule = activity[:prize]
      activity_rule_arr = activity_rule.split('-')
      prize_base = Integer(activity_rule_arr[0])
      prize_rates = activity_rule_arr[1].split(',')

      random_number = (PerfectRandom::rand % prize_base) + 1
      prize_rates.each do |rate|
        rate_ele = rate.split(':')
        rate_number = Integer(rate_ele[0])
        prize_id = Integer(rate_ele[1])
        if random_number <= rate_number
          @prize_id = prize_id
          break;
        end
      end

      prize_obj = Ih_nh_prize.find(@prize_id)
      coupon = generate_coupon(activity_id, open_id)

      Ih_nh_qrcode.create(
          open_id: open_id,
          name: prize_obj[:name],
          activity_id: activity_id,
          code: coupon,
          start_date: prize_obj[:start_date],
          end_date: prize_obj[:end_date],
          activity_type: prize_obj[:prize_type],
          discount: prize_obj[:discount],
          denomination: prize_obj[:denomination]
      )
      user_join_activity(open_id, activity_id)

      res[:status] = ACTIVITY_CREATE_SUCC
      res[:code] = coupon
      res[:name] = prize_obj[:name]
      res[:start_date] = prize_obj[:start_date]
      res[:end_date] = prize_obj[:end_date]

    end

    res

  end

  private

  def get_order_number_by_id(order_id)
    order = 0
    0.upto(@MAGIC.length - 1)  {|i| order = order << 1 | (order_id[i] ^ @MAGIC[i]) }
    order
  end

  # Weixin
  def user_join_activity(open_id, activity_id)
    time = get_current_time
    Ih_nh_user_activity.create(
        open_id: open_id,
        activity_id: activity_id,
        status: 'activated',
        join_date: time,
        activated_date: time
    )
  end

  def send_first_time_subscribe_coupon(open_id)
    activity = Ih_nh_activities.find_by(ID: 1)
    coupon = generate_coupon(activity[:ID], open_id)
    Ih_nh_qrcode.create(
                    owner_id: open_id,
                    activity_id: activity[:ID],
                    code: coupon,
                    start_date: activity[:start_date],
                    end_date: activity[:end_date],
                    activity_type: activity[:activity_type],
                    discount: activity[:discount],
                    denomination: activity[:denomination]
    )
  end

  def generate_coupon(activity_id, index)
    created_time = get_current_time;
    Digest::MD5.hexdigest("NorthernHemisphere:#{activity_id}:#{created_time}:#{index}")
  end

  def get_current_time
    Time.now.strftime('%Y-%m-%d %H:%M:%S')
  end

  def get_empty_time
    '0000-00-00 00:00:00'
  end

  # Account
  def get_group(group_id)
    Ih_account_group.find(group_id)
  end

  def get_user_sale_records(user_id)
    Ih_account_money.where(user_id: user_id)
  end

  def get_account_field
    Ih_account_field.all
  end

  def get_account_field_detail
    Ih_account_field_detail.all
  end

  def get_group_users_detail_info(user_ids)
    users_arr = user_ids.split(',')
    user_detail_hash = Hash.new
    users_arr.each do |element|
      user_detail_hash[element] = get_user(element)
    end

    user_detail_hash
  end

  def get_group_users_records(user_ids)
    users_arr = user_ids.split(',')
    user_sale_records_hash = Hash.new
    users_arr.each do |element|
      user_sale_records_hash[element] = get_user_sale_records(element)
    end

    user_sale_records_hash
  end

  def get_bbq_administrator_group_alias
    alias_arr = Array.new
    users_arr = Ih_users.where(group_id: 99)
    users_arr.each do |element|
      alias_arr.push element[:user_email]
    end

    alias_arr
  end

  def get_alias_by_order_state(order_state, user_id)
    case order_state
      when '1'
        user_alias = get_bbq_administrator_group_alias
      else
        user = get_user user_id
        user_alias = [user[:user_email]]
    end

    user_alias
  end

  def get_audience_type_by_order_state(order_state)
    case order_state
      when '10'
        audience = 'manager'
      when '21'
        audience = 'all'
      else
        audience = 'single'
    end

    audience
  end

  def get_message_by_order_state(order_state, order_number)
    case order_state
      when '1'
        message = "有新订单：#{order_number}，请确认发货。"
      when '2'
        message = "您的订单：#{order_number}，店主已经确认，准备发货中。"
      when '3'
        message = "您的订单：#{order_number}，快递员已出发。"
      when '4'
        message = "您的订单：#{order_number}，支付信息已经确认。"
      when '5'
        message = "您的订单：#{order_number}，已经完成，欢迎反馈。祝您心情愉快。"
      else
        message = '北伴球进口食品店'
    end

    message
  end

  def write_exception_details_to_log(exception, request, request_parameters)
    puts exception.message
    @logger.error_details(exception.message, request, request_parameters, 'IhakulaStore')
  end

end
