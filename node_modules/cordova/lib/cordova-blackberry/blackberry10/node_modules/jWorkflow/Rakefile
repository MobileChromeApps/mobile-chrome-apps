require 'rubygems'
require 'closure-compiler'

task :default => [:build]

desc "Use the Closure Compiler to compress jWorkflow.js"
task :build do
  js  = File.open('lib/jWorkflow.js', 'r')
  min = Closure::Compiler.new.compile(js)
  File.open('jworkflow-min-0.7.0.js', 'w') {|f| f.write(min) }
end

