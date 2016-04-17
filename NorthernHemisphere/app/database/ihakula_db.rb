require 'active_record'
require 'mysql2'

#Connetction
ActiveRecord::Base.establish_connection(
    adapter:  'mysql2',
    host:     '127.0.0.1',
    database: 'ihakula',
    username: 'root',
    password: 'Wayde191!'
)

#Model

class Ih_products < ActiveRecord::Base
end

class Ih_users < ActiveRecord::Base
    self.table_name = 'ih_users'
end


# Account
class Ih_account_group < ActiveRecord::Base
    self.table_name = 'ih_account_group'
end

class Ih_account_field < ActiveRecord::Base
    self.table_name = 'ih_account_field'
    self.inheritance_column = :_type_disabled
end

class Ih_account_field_detail < ActiveRecord::Base
    self.table_name = 'ih_account_field_detail'
    self.inheritance_column = :_type_disabled
end

class Ih_account_money < ActiveRecord::Base
    self.table_name = 'ih_account_money'
end

# Northern Hemisphere Weixin
class Ih_nh_activities < ActiveRecord::Base
    self.table_name = 'ih_nh_activities'
end

class Ih_nh_qrcode < ActiveRecord::Base
    self.table_name = 'ih_nh_qrcode'
end

class Ih_nh_user < ActiveRecord::Base
    self.table_name = 'ih_nh_user'
end

class Ih_nh_requests < ActiveRecord::Base
    self.table_name = 'ih_nh_requests'
end

class Ih_nh_user_activity < ActiveRecord::Base
    self.table_name = 'ih_nh_user_activity'
end

class Ih_nh_prize < ActiveRecord::Base
    self.table_name = 'ih_nh_prize'
end

# Database Updates
class Ih_nh_member < ActiveRecord::Base
    self.table_name = 'ih_nh_member'
end

class Ih_nh_goods_type < ActiveRecord::Base
    self.table_name = 'ih_nh_goods_type'
end

class Ih_nh_goods < ActiveRecord::Base
    self.table_name = 'ih_nh_goods'
end

class Ih_nh_order < ActiveRecord::Base
    self.table_name = 'ih_nh_order'
end

class Ih_nh_contact < ActiveRecord::Base
    self.table_name = 'ih_nh_contact'
end