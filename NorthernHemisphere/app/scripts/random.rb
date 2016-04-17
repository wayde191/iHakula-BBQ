require 'perfect-random-number-generator'

def random
    prize_base = 100
    prize_rates = '3:5,13:6,33:7,100:8'.split(',')
    
    random_number = (PerfectRandom::rand % prize_base) + 1
    puts random_number
    prize_rates.each do |rate|
        rate_ele = rate.split(':')
        rate_number = Integer(rate_ele[0])
        prize_id = Integer(rate_ele[1])
        if random_number <= rate_number
            puts (prize_id - 4)
            puts '============================='
            
            break;
        end
    end
end

i = 0
num = 100

while i < num do
    random
    i += 1
end