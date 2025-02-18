from typing import BinaryIO
from sqlalchemy import engine
from sqlalchemy.sql.schema import DEFAULT_NAMING_CONVENTION
from flask_restx import Resource
from flask import request, send_from_directory, make_response
from flask_jwt_extended import jwt_required, get_jwt_identity
from lost.api.api import api
from lost.settings import LOST_CONFIG, FLASK_DEBUG
from lost.db import access, roles
from lost.api.annotask.parsers import annotask_parser
from lost.logic import anno_task as annotask_service
from lost.logic.file_man import FileMan
import json
import os
from lost.pyapi import pe_base
from io import BytesIO
namespace = api.namespace('data', description='Data API.')

@namespace.route('/<string:path>')
class Data(Resource): 
    @jwt_required 
    def get(self, path):
        print(path)
        dbm = access.DBMan(LOST_CONFIG)
        identity = get_jwt_identity()
        user = dbm.get_user_by_id(identity)
        if not user.has_role(roles.ANNOTATOR):
            dbm.close_session()
            return "You are not authorized.", 401
        else:
            raise Exception('data/ -> Not Implemented!')
            # return send_from_directory(os.path.join(LOST_CONFIG.project_path, 'data'), path)

# @namespace.route('/logs/<path:path>')
# class Logs(Resource): 
#     @jwt_required 
#     def get(self, path):
#         print(path)
#         dbm = access.DBMan(LOST_CONFIG)
#         identity = get_jwt_identity()
#         user = dbm.get_user_by_id(identity)
#         if not user.has_role(roles.ANNOTATOR):
#             dbm.close_session()
#             return "You are not authorized.", 401
#         else:
#             # raise Exception('data/logs/ -> Not Implemented!')
#             fm = FileMan(LOST_CONFIG)
#             with fm.fs.open(fm.get_abs_path(path), 'rb') as f:
#                 resp = make_response(f.read())
#                 resp.headers["Content-Disposition"] = "attachment; filename=log.csv"
#                 resp.headers["Content-Type"] = "text/csv"
#             return resp

#             # return send_from_directory(os.path.join(LOST_CONFIG.project_path, 'data/logs'), path)

@namespace.route('/logs/<path:path>')
#@namespace.param('path', 'Path to logfile')
class Logs(Resource):
    @jwt_required 
    def get(self, path):
        print(path)
        dbm = access.DBMan(LOST_CONFIG)
        identity = get_jwt_identity()
        user = dbm.get_user_by_id(identity)
        if not user.has_role(roles.ANNOTATOR):
            dbm.close_session()
            return "You are not authorized.", 401
        else:
            # raise Exception('data/logs/ -> Not Implemented!')
            fm = FileMan(LOST_CONFIG)
            with fm.fs.open(fm.get_abs_path(path), 'rb') as f:
                resp = make_response(f.read())
                resp.headers["Content-Disposition"] = "attachment; filename=log.csv"
                resp.headers["Content-Type"] = "text/csv"
            return resp

@namespace.route('/dataexport/<deid>')
#@namespace.param('path', 'Path to logfile')
class DataExport(Resource):
    @jwt_required 
    def get(self, deid):
        dbm = access.DBMan(LOST_CONFIG)
        identity = get_jwt_identity()
        user = dbm.get_user_by_id(identity)
        if not user.has_role(roles.DESIGNER):
            dbm.close_session()
            return "You are not authorized.", 401
        else:
            # data = json.loads(request.data)
            de = dbm.get_data_export(deid)
            fs_db = de.fs
            fm = FileMan(fs_db=fs_db)
            with fm.fs.open(de.file_path, 'rb') as f:
                resp = make_response(f.read())
                resp.headers["Content-Disposition"] = "attachment; filename=annos.parquet"
                resp.headers["Content-Type"] = "blob"
            return resp

@namespace.route('/annoexport/<peid>')
class AnnoExport(Resource):
    @jwt_required 
    def get(self, peid):
         dbm = access.DBMan(LOST_CONFIG)
         identity = get_jwt_identity()
         user = dbm.get_user_by_id(identity)
         if not user.has_role(roles.DESIGNER):
             dbm.close_session()
             return "You are not authorized.", 401
         else:
             pe_db = dbm.get_pipe_element(pipe_e_id=peid)
             pe = pe_base.Element(pe_db, dbm)
             df = pe.inp.to_df()
             # raise Exception('GO ON HERE !!!')
             f = BytesIO()
             df.to_parquet(f)
             f.seek(0)
             resp = make_response(f.read())
             resp.headers["Content-Disposition"] = "attachment; filename=annos.parquet"
             resp.headers["Content-Type"] = "blob"
             return resp


@namespace.route('/workerlogs/<path:path>')
class Logs(Resource): 
    @jwt_required 
    def get(self, path):
        print(path)
        dbm = access.DBMan(LOST_CONFIG)
        identity = get_jwt_identity()
        user = dbm.get_user_by_id(identity)
        if not user.has_role(roles.ANNOTATOR):
            dbm.close_session()
            return "You are not authorized.", 401
        else:
            raise Exception('data/workerlogs/ -> Not Implemented!')
            # return send_from_directory(os.path.join(LOST_CONFIG.project_path, 'logs'), path)