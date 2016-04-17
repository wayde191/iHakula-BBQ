require 'sinatra/base'
require 'sinatra/config_file'
require 'sinatra/json'
require 'json'
require 'sinatra/cookies'

require_relative '../stores/ihakula_store'
require_relative '../stores/ihakula_push_store'
require_relative '../log/log_formatter'
require_relative '../log/log_wrapper'

class IhakulaResource < Sinatra::Base

  helpers Sinatra::JSON
  register Sinatra::ConfigFile
  set :environments, %w{development test prod}
  config_file '../../config.yml'
  use Rack::Session::Cookie, {secret: settings.session_secret}

  post '/push_notification' do
    write_request_details_to_log('IhakulaResource', request, '{push}')
    json ihakula_store.push_notification params
  end

  get '/sale/records' do
    write_request_details_to_log('IhakulaResource', request, '{}')
    json ihakula_store.get_all_sale_records(get_current_user_group_id())
  end

  get '/accounts' do
    write_request_details_to_log('IhakulaResource', request, '{hello:world}')
    json ihakula_store.get_all_accounts
  end

  post '/goods' do
    write_request_details_to_log('IhakulaResource', request, '{get:goods}')
    json ihakula_store.get_goods
  end

  post '/cancel/order' do
    write_request_details_to_log('IhakulaResource', request, '{cancel:order}')
    json ihakula_store.cancel_order params
  end

  post '/order/detail' do
    write_request_details_to_log('IhakulaResource', request, '{get:orderDetails}')
    json ihakula_store.get_order_detail params
  end

  post '/order/accepted' do
    write_request_details_to_log('IhakulaResource', request, '{order:accepted}')
    json ihakula_store.order_accepted params
  end

  post '/order/delivery' do
    write_request_details_to_log('IhakulaResource', request, '{order:delivery}')
    json ihakula_store.order_delivery params
  end

  post '/order/paid' do
    write_request_details_to_log('IhakulaResource', request, '{order:paid}')
    json ihakula_store.order_paid params
  end

  post '/order/finished' do
    write_request_details_to_log('IhakulaResource', request, '{order:finished}')
    json ihakula_store.order_finished params
  end

  post '/insert/order' do
    write_request_details_to_log('IhakulaResource', request, '{insert:order}')
    json ihakula_store.insert_order params
  end

  post '/in/progress/orders' do
    write_request_details_to_log('IhakulaResource', request, '{/in/progress/orders:order}')
    if params[:group_id] == '99'
      json ihakula_store.all_in_progress_orders
    else
      json ihakula_store.in_progress_orders params
    end
  end

  post '/finished/orders' do
    write_request_details_to_log('IhakulaResource', request, '{/finished/orders:order}')
    if params[:group_id] == '99'
      json ihakula_store.all_finished_orders
    else
      json ihakula_store.finished_orders params
    end

  end

  private

  def ihakula_store
    IhakulaStore.new(settings)
  end

  def ihakula_push_store
    IhakulaPushStore.new(settings)
  end

  def write_request_details_to_log(action, request, request_parameters)
    @logger = LogWrapper.new(LogFormatter.new, settings)
    @logger.info_details(action, request, request_parameters, 'IhakulaResource')
  end

  def get_current_user_group_id
    session[:group_id]
  end

end
