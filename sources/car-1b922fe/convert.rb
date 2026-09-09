# Project-authored Apache-2.0 source conversion; project code is MIT licensed.
# Maintenance-only: Ruby 2.6+ standard libraries, no gem installation or upstream execution.
require 'yaml'
require 'json'
require 'digest'

root = File.expand_path(__dir__)
check = ARGV == ['--check']
abort 'Usage: ruby convert.rb [--check]' unless ARGV.empty? || check
records = Dir.glob(File.join(root, 'raw/analytics/*.yaml')).sort.map do |filename|
  abort 'Refusing source symbolic link' if File.symlink?(filename)
  bytes = File.binread(filename)
  # No object construction, aliases, or execution of source test commands.
  data = YAML.safe_load(bytes, permitted_classes: [], permitted_symbols: [], aliases: false)
  { 'path' => filename.delete_prefix(root + '/'), 'sha256' => Digest::SHA256.hexdigest(bytes), 'data' => data }
end
derived = JSON.pretty_generate(records) + "\n"
target = File.join(root, 'derived/analytics.json')
if check
  abort 'CAR YAML conversion mismatch' unless File.binread(target) == derived.b
  puts "Verified #{records.size} CAR YAML records against pinned JSON"
else
  File.open(target, 'wx') { |file| file.write(derived) }
  files = ['convert.rb'] + Dir.glob(File.join(root, 'raw/**/*')).select { |file| File.file?(file) }.map { |file| file.delete_prefix(root + '/') } + ['derived/analytics.json']
  manifest = {
    'schemaVersion' => 1,
    'project' => 'MITRE Cyber Analytics Repository',
    'repository' => 'https://github.com/mitre-attack/car',
    'commit' => '1b922fe1527d956e222a99473472e594f10f610b',
    'license' => 'Apache-2.0',
    'conversion' => 'Unmodified YAML decoded using Ruby Psych safe_load; all fields retained. JSON is a project-generated representation, not an upstream release.',
    'analytics' => records.size,
    'files' => files.sort.map do |relative|
      bytes = File.binread(File.join(root, relative))
      { 'path' => relative, 'bytes' => bytes.bytesize, 'sha256' => Digest::SHA256.hexdigest(bytes) }
    end
  }
  File.open(File.join(root, 'manifest.json'), 'wx') { |file| file.write(JSON.pretty_generate(manifest) + "\n") }
end
