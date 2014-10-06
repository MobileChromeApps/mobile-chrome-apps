iptables -A INPUT -s 172.23.188.139 --dport 5984 -j ACCEPT
iptables -A INPUT -s 172.23.188.139 --dport 9889 -j ACCEPT
iptables -A INPUT -s 172.23.188.139 --dport 5984 -j ACCEPT
iptables -A INPUT -i eth0 -p tcp --dport 22 -j ACCEPT

