# config.ru
root = ::File.dirname(__FILE__)
require ::File.join(root, 'app/northern_hemisphere_app')

run NorthernHemisphereApp
