# -*- coding: utf-8 -*-
import string
import sys
import os
import requests
import ens_api
import simplejson
import commands


# 1. 获取到当前的需要处理的包处理到包名
# 2. 拿到包下面的两个文件 bricks.json stories.json
# 3. 读取两个文件的内容
# 4. 调用接口，发送文件内容
class NameServiceError(Exception):
  pass


def collect(install_path):
  if not os.path.exists(install_path):
    raise Exception("could not find install path {}".format(install_path))
  if not os.path.isdir(install_path):
    raise Exception("install_path must be a dir {}".format(install_path))
  package_name = os.path.split(string.rstrip(install_path, chars=os.sep))[-1]
  if not package_name.endswith("NB"):
    raise Exception("package suffix error; packageName %s" % package_name)
  bricks_path = os.path.join(install_path, "dist", "bricks.json")
  if not os.path.exists(bricks_path):
    raise Exception("could not find bricks.json path {}".format(bricks_path))
  stories_path = os.path.join(install_path, "dist", "stories.json")
  with open(bricks_path) as bricks_file:
    bricks_content = simplejson.load(bricks_file)
  stories_content = []
  if os.path.exists(stories_path):
    with open(stories_path) as stories_file:
      stories_content = simplejson.load(stories_file)
  snippets_path = os.path.join(install_path, "dist", "snippets.json")
  snippets_content = {"snippets": []}
  if os.path.exists(snippets_path):
    with open(snippets_path) as snippets_file:
      snippets_content = simplejson.load(snippets_file)
  return package_name, bricks_content, stories_content, snippets_content


def report_bricks_atom(org, package_name, bricks_content, stories_content, snippets_content):
  session_id, ip, port = ens_api.get_service_by_name("web.brick_next", "logic.micro_app_service")
  if session_id <= 0:
    raise NameServiceError("get nameservice logic.micro_app_service error, session_id={}".format(session_id))
  address = "{}:{}".format(ip, port)
  headers = {"org": str(org), "user": "defaultUser"}
  # report atom
  atom_url = "http://{}/api/v1/brick/atom/import".format(address)
  atom_param = {"packageName": package_name, "data": {"stories": stories_content, "bricks": bricks_content}}
  rsp = requests.post(atom_url, json=atom_param, headers=headers)
  rsp.raise_for_status()
  # report snippet
  snippet_url = "http://{}/api/v1/brick/snippet/import".format(address)
  snippet_param = {"packageName": package_name, "snippets": snippets_content}
  rsp = requests.post(snippet_url, json=snippet_param, headers=headers)
  rsp.raise_for_status()


if __name__ == "__main__":
  # 兼容老nb包install_postscript.sh调用report_installed_brick_next_package仅传入包路径
  if len(sys.argv) == 2:
    sys.exit(0)

  if len(sys.argv) != 3:
    print("Usage: ./report_installed_brick_next_package.py $org $install_path")
    sys.exit(1)

  cmd = "/usr/local/easyops/deploy_init/tools/get_env.py micro_app_service report_brick_info"
  status_code, res = commands.getstatusoutput(cmd)
  status_code = os.WEXITSTATUS(status_code)
  if status_code == 0 and res == "true":
    org = sys.argv[1]
    install_path = sys.argv[2]
    package_name, bricks_content, stories_content, snippets_content = collect(install_path)
    if package_name and bricks_content and snippets_content:
      report_bricks_atom(org, package_name, bricks_content, stories_content, snippets_content)
  elif status_code == 2:
    sys.exit(0)
  else:
    raise Exception("%s exec fail;status_code: %s;output: %s" % (cmd, status_code, res))
