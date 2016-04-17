# encoding: utf-8

require 'sinatra/base'
require 'sinatra/config_file'
require 'sinatra/json'
require 'json'
require 'sinatra/cookies'
require 'csv'

require_relative '../authentication'
require_relative '../stores/ihakula_store'
require_relative '../log/log_formatter'
require_relative '../log/log_wrapper'

class DataResource < Sinatra::Base

  helpers Sinatra::JSON
  register Sinatra::ConfigFile
  set :environments, %w{development test prod}
  config_file '../../config.yml'

  post '/database/upload' do
    File.open('uploads/' + 'member.csv', 'w') do |f|
      f.write(params['fileField'][:tempfile].read)
    end

    response_str = '============更新成功===============<br>'
    CSV.foreach('uploads/member.csv') do |user|
      phone = user[0]
      db_user = Ih_nh_member.find_by(phone:phone)
      if db_user.nil?
        Ih_nh_member.create(name: user[2],
                            phone: phone,
                            shop_score: '0',
                            app_score: '0',
                            sex: 'M'

        )

        response_str += "#{user[2]}:#{phone}<br>"
      end
    end

    response_str += '===============================<br>'
    response_str
  end

  post '/database/upload_goods_type' do
    File.open('uploads/' + 'goodsType.csv', 'w') do |f|
      f.write(params['fileField'][:tempfile].read)
    end

    response_str = '============更新成功===============<br>'
    CSV.foreach('uploads/goodsType.csv') do |user|
      good_id = user[0]
      db_user = Ih_nh_goods_type.find_by(ID:good_id)
      if db_user.nil?
        Ih_nh_goods_type.create(type_id: good_id,
                                type_name: user[1]
        )

        response_str += "#{good_id}:#{user[1]}<br>"
      end
    end

    response_str += '===============================<br>'
    response_str
  end

  post '/database/upload_goods' do
    File.open('uploads/' + 'goods.csv', 'w') do |f|
      f.write(params['fileField'][:tempfile].read)
    end

    response_str = '============更新成功===============<br>'
    CSV.foreach('uploads/goods.csv') do |user|
      code = user[0]
      if '0' == code[0]
        code = code[1..-1]
      end
      unless check_goods_number?(code)
        next
      end

      db_user = Ih_nh_goods.find_by(code:code)
      if db_user.nil?
        Ih_nh_goods.create(code: code,
                           qrcode: user[1],
                           name: user[2],
                           type_id: user[3],
                           capacity: user[4],
                           unit: user[5],
                           base_price: user[6],
                           sale_price: user[7],
                           member_price: user[8],
                           origin_country: user[9],
                           introduction: user[10],
                           stock: user[11],
                           image_url: user[12]
        )
      else
        db_user[:qrcode] = user[1]
        db_user[:name] = user[2]
        db_user[:type_id] = user[3]
        db_user[:capacity] = user[4]
        db_user[:unit] = user[5]
        db_user[:base_price] = user[6]
        db_user[:sale_price] = user[7]
        db_user[:member_price] = user[8]
        db_user[:origin_country] = user[9]
        db_user[:introduction] = user[10]
        db_user[:stock] = user[11]
        db_user[:image_url] = user[12]
        db_user.save

      end
      response_str += "#{code}:#{user[1]}:#{user[2]}:#{user[3]}:#{user[4]}:#{user[5]}:#{user[6]}:#{user[7]}:#{user[8]}<br>"

    end

    response_str += '===============================<br>'
    response_str
  end

  post '/database/update/existing_product' do
    save_uploaded_file
    response_str = update_image_path
    response_str += update_stock
    response_str
  end

  post '/database/update/image' do
    save_uploaded_file
    update_image_path
  end

  post '/database/update/stock' do
    save_uploaded_file
    update_stock
  end

  post '/database/restore/product' do
    save_uploaded_file
    restore_new_product
  end

  post '/database/add/new/product' do
    save_uploaded_file
    add_new_product
  end

  post '/database/update/product_ranking' do
    save_uploaded_file
    response_str = update_recommend
    response_str += update_ranking
    response_str
  end

  post '/database/update/recommend' do
    save_uploaded_file
    update_recommend
  end

  post '/database/update/ranking' do
    save_uploaded_file
    update_ranking
  end

  post '/database/counter/new/goods' do
    File.open('uploads/' + 'goods.csv', 'w') do |f|
      f.write(params['fileField'][:tempfile].read)
    end

    response_str = '============新商品列表===============<br>'
    counter = 0

    column_1 = '商品编号'
    column_2 = '条形码'
    column_3 = '商口名称'
    column_4 = '类型'
    column_5 = '商品规格'
    column_6 = '单位'
    column_7 = '进价'
    column_8 = '售价'
    column_9 = '会员价'
    column_10 = '产地'
    column_11 = '描述'
    column_12 = '有货'
    column_13 = '图片'
    column_14 = '推荐'
    column_15 = '排名'
    column_16 = '新品'

    CSV.open('uploads/new_product.csv', 'wb') do |csv|
      csv << [column_1, column_2, column_3, column_4, column_5, column_6, column_7, column_8, column_9, column_10, column_11, column_12, column_13, column_14, column_15, column_16]

      CSV.foreach('uploads/goods.csv') do |user|
        code = user[0]
        if '0' == code[0]
          code = code[1..-1]
        end
        unless check_goods_number?(code)
          next
        end

        db_user = Ih_nh_goods.find_by(code:code)
        if db_user.nil?
          response_str += "#{code}:#{user[1]}:#{user[2]}:#{user[3]}:#{user[4]}:#{user[5]}:#{user[6]}:#{user[7]}:#{user[8]}<br>"
          csv << [code, user[1], user[2], user[3], user[4], user[5], user[6], user[7], user[8], '', '', '', '', '', '', '']
          counter = counter + 1
        end
      end

    end

    response_str += "===============#{counter}============<br>"
    response_str += '===============================<br>'

    response_str
  end

  post '/database/export/csv/goods' do
    export_goods_csv
  end

  post '/database/update/member_price' do
    update_member_price
  end

  private

  def update_member_price
    column_1 = '商品编号'
    column_8 = '售价'
    column_9 = '会员价'

    response_str = "<table><tr><th>#{column_1}</th><th>#{column_8}</th><th>#{column_9}</th></tr>"

    CSV.open('uploads/export_all_products.csv', 'wb') do |csv|
      csv << [column_1, column_8, column_9]
      all_goods = Ih_nh_goods.all
      all_goods.each do |user|
        code = user[:code]
        sale_price = user[:sale_price]
        unless sale_price.nil?
          if user[:type_id] == 2
            user[:member_price] = sale_price
            user.save
          else
            user[:member_price] = format('%.1f', sale_price * 0.9).to_f
            user.save
          end

        end
        member_price = user[:member_price]


        response_str += "<tr><td>#{code}</td><td>#{sale_price}</td>
                               <td>#{member_price}</td>
                          </tr>"
        csv << [code, sale_price, member_price]
      end
    end


    response_str += '</table>'
    response_str
  end

  def export_goods_csv
    column_1 = '商品编号'
    column_2 = '条形码'
    column_3 = '商口名称'
    column_4 = '类型'
    column_5 = '商品规格'
    column_6 = '单位'
    column_7 = '进价'
    column_8 = '售价'
    column_9 = '会员价'
    column_10 = '产地'
    column_11 = '描述'
    column_12 = '有货'
    column_13 = '图片'
    column_14 = '推荐'
    column_15 = '排名'
    column_16 = '新品'

    response_str = "<table><tr><th>#{column_1}</th><th>#{column_2}</th><th>#{column_3}</th><th>#{column_4}</th><th>#{column_5}</th><th>#{column_6}</th><th>#{column_7}</th><th>#{column_8}</th><th>#{column_9}</th><th>#{column_10}</th><th>#{column_11}</th><th>#{column_12}</th><th>#{column_13}</th><th>#{column_14}</th><th>#{column_15}</th><th>#{column_16}</th></tr>"

    CSV.open('uploads/export_all_products.csv', 'wb') do |csv|
      csv << [column_1, column_2, column_3, column_4, column_5, column_6, column_7, column_8, column_9, column_10, column_11, column_12, column_13, column_14, column_15, column_16]
      all_goods = Ih_nh_goods.all
      all_goods.each do |user|
        code = user[:code]
        qrcode = user[:qrcode]
        name = user[:name]
        type_id = user[:type_id]
        capacity = user[:capacity]
        unit = user[:unit]
        base_price = user[:base_price]
        sale_price = user[:sale_price]
        member_price = user[:member_price]
        origin_country = user[:origin_country]
        introduction = user[:introduction]
        stock = user[:stock]
        image_url = user[:image_url]
        recommend = user[:recommend]
        ranking = user[:ranking]
        new_product = user[:new_product]

        response_str += "<tr><td>#{code}</td><td>#{qrcode}</td>
                               <td>#{name}</td><td>#{type_id}</td>
                               <td>#{capacity}</td><td>#{unit}</td>
                               <td>#{base_price}</td><td>#{sale_price}</td>
                               <td>#{member_price}</td><td>#{origin_country}</td>
                               <td>#{introduction}</td><td>#{stock}</td>
                               <td>#{image_url}</td><td>#{recommend}</td>
                               <td>#{ranking}</td><td>#{new_product}</td>
                          </tr>"
        csv << [code, qrcode, name, type_id, capacity, unit, base_price, sale_price,
                member_price, origin_country, introduction, stock, image_url, recommend,
                ranking, new_product]
      end
    end


    response_str += '</table>'
    response_str
  end

  def add_new_product

    column_1 = '商品编号'
    column_2 = '条形码'
    column_3 = '商口名称'
    column_4 = '类型'
    column_5 = '商品规格'
    column_6 = '单位'
    column_7 = '进价'
    column_8 = '售价'
    column_9 = '会员价'
    column_10 = '产地'
    column_11 = '描述'
    column_12 = '有货'
    column_13 = '图片'
    column_14 = '推荐'
    column_15 = '排名'
    column_16 = '新品'

    response_str = "<table><tr><th>#{column_1}</th><th>#{column_2}</th><th>#{column_3}</th><th>#{column_4}</th><th>#{column_5}</th><th>#{column_6}</th><th>#{column_7}</th><th>#{column_8}</th><th>#{column_9}</th><th>#{column_10}</th><th>#{column_11}</th><th>#{column_12}</th><th>#{column_13}</th><th>#{column_14}</th><th>#{column_15}</th><th>#{column_16}</th></tr>"

    CSV.open('uploads/update_new_product.csv', 'wb') do |csv|
      csv << [column_1, column_2, column_3, column_4, column_5, column_6, column_7, column_8, column_9, column_10, column_11, column_12, column_13, column_14, column_15, column_16]
      CSV.foreach('uploads/goods.csv') do |user|
        code = user[0]
        if '0' == code[0]
          code = code[1..-1]
        end
        unless check_goods_number?(code)
          next
        end

        qrcode = user[1]
        name = user[2]
        type_id = user[3]
        capacity = user[4]
        unit = user[5]
        base_price = user[6]
        sale_price = user[7]
        member_price = user[8]
        origin_country = user[9] != '' ? user[9] : '中国'
        introduction = user[10]
        stock = user[11] != '' ? user[11] : '1'
        image_url = user[12] != '' ? user[12] : (code + '.jpg')
        recommend = user[13]
        ranking = user[14] != '' ? user[14] : 9999
        new_product = user[15] != '' ? user[15] : 'yes'

        db_user = Ih_nh_goods.find_by(code:code)
        if db_user.nil?
          Ih_nh_goods.create(code: code,
                             qrcode: qrcode,
                             name: name,
                             type_id: type_id,
                             capacity: capacity,
                             unit: unit,
                             base_price: base_price,
                             sale_price: sale_price,
                             member_price: member_price,
                             origin_country: origin_country,
                             introduction: introduction,
                             stock: stock,
                             image_url: image_url,
                             recommend: recommend,
                             ranking: ranking,
                             new_product: new_product
          )

          response_str += "<tr><td>#{code}</td><td>#{qrcode}</td>
                               <td>#{name}</td><td>#{type_id}</td>
                               <td>#{capacity}</td><td>#{unit}</td>
                               <td>#{base_price}</td><td>#{sale_price}</td>
                               <td>#{member_price}</td><td>#{origin_country}</td>
                               <td>#{introduction}</td><td>#{stock}</td>
                               <td>#{image_url}</td><td>#{recommend}</td>
                               <td>#{ranking}</td><td>#{new_product}</td>
                          </tr>"
          csv << [code, qrcode, name, type_id, capacity, unit, base_price, sale_price,
                  member_price, origin_country, introduction, stock, image_url, recommend,
                  ranking, new_product]


        end
      end
    end


    response_str += '</table>'
    response_str
  end

  def restore_new_product
    response_str = '<table border="1"><tr><th>code</th><th>stock</th></tr>'
    column_1 = 'code'
    column_2 = 'stock'
    all_goods = Ih_nh_goods.all
    CSV.open('uploads/restore_new_product.csv', 'wb') do |csv|
      csv << [column_1, column_2]
      all_goods.each do |goods|
        code = goods[:code]
        flag = goods[:new_product]
        response_str += "<tr><td>#{code}</td><td>#{flag}</td></tr>"
        goods[:new_product] = 'no'
        goods.save

        csv << [code, flag]
      end
    end

    response_str += '</table>'
    response_str
  end

  def update_recommend
    response_str = '<table border="1"><tr><th>code</th><th>recommend</th></tr>'
    column_1 = 'code'
    column_2 = 'recommend'
    CSV.open('uploads/update_recommend.csv', 'wb') do |csv|
      csv << [column_1, column_2]
      CSV.foreach('uploads/goods.csv') do |user|
        code = user[0]
        unless check_goods_number?(code)
          next
        end

        if '0' == code[0]
          code = code[1..-1]
        end

        recommend = user[13]
        db_user = Ih_nh_goods.find_by(code:code)
        unless db_user.nil?
          unless recommend == db_user[:recommend]
            db_user[:recommend] = user[13].nil? ? 9999 : user[13]
            db_user.save

            response_str += "<tr><td>#{code}</td><td>#{recommend}</td></tr>"
            csv << [code, recommend]
          end
        end
      end
    end

    response_str += '</table>'
    response_str
  end

  def update_ranking
    response_str = '<table border="1"><tr><th>code</th><th>ranking</th></tr>'
    column_1 = 'code'
    column_2 = 'ranking'
    CSV.open('uploads/update_ranking.csv', 'wb') do |csv|
      csv << [column_1, column_2]
      CSV.foreach('uploads/goods.csv') do |user|
        code = user[0]
        unless check_goods_number?(code)
          next
        end

        if '0' == code[0]
          code = code[1..-1]
        end

        ranking = user[14]
        db_user = Ih_nh_goods.find_by(code:code)
        unless db_user.nil?
          unless ranking == db_user[:ranking]
            db_user[:ranking] = user[14]
            db_user.save

            response_str += "<tr><td>#{code}</td><td>#{ranking}</td></tr>"
            csv << [code, ranking]
          end
        end
      end
    end


    response_str += '</table>'
    response_str
  end

  def update_stock
    response_str = '<table border="1"><tr><th>code</th><th>stock</th></tr>'
    column_1 = 'code'
    column_2 = 'stock'
    CSV.open('uploads/update_stock.csv', 'wb') do |csv|
      csv << [column_1, column_2]
      CSV.foreach('uploads/goods.csv') do |user|
        code = user[0]
        unless check_goods_number?(code)
          next
        end

        if '0' == code[0]
          code = code[1..-1]
        end

        stock = user[11]
        db_user = Ih_nh_goods.find_by(code:code)
        unless db_user.nil?
          unless stock == db_user[:stock]
            db_user[:stock] = user[11]
            db_user.save

            response_str += "<tr><td>#{code}</td><td>#{stock}</td></tr>"
            csv << [code, stock]
          end
        end
      end
    end


    response_str += '</table>'
    response_str
  end

  def update_image_path
    response_str = '<table border="1"><tr><th>code</th><th>image_url</th></tr>'
    column_1 = 'code'
    column_2 = 'image_url'
    CSV.open('uploads/update_image_path.csv', 'wb') do |csv|
      csv << [column_1, column_2]
      CSV.foreach('uploads/goods.csv') do |user|
        code = user[0]
        unless check_goods_number?(code)
          next
        end

        if '0' == code[0]
          code = code[1..-1]
        end

        image_url = user[12]
        db_user = Ih_nh_goods.find_by(code:code)
        unless db_user.nil?
          unless image_url == db_user[:image_url]
            db_user[:image_url] = user[12]
            db_user.save

            response_str += "<tr><td>#{code}</td><td>#{image_url}</td></tr>"
            csv << [code, image_url]
          end
        end
      end
    end

    response_str += '</table>'
    response_str
  end

  def save_uploaded_file
    File.open('uploads/' + 'goods.csv', 'w') do |f|
      f.write(params['fileField'][:tempfile].read)
    end
  end

  def check_goods_number?(goods_number)
    goods_number =~ /^\d{1,10}$/
  end

  def authentication
    Authentication.new(self, settings.auth_strategy)
  end

  def ihakula_store
    IhakulaStore.new(settings)
  end

  def write_request_details_to_log(action, request, request_parameters)
    @logger = LogWrapper.new(LogFormatter.new, settings)
    @logger.info_details(action, request, request_parameters, 'IhakulaResource')
  end

end
