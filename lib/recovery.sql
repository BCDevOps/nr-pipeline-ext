WHENEVER SQLERROR EXIT SQL.SQLCODE
call oraexp.IMPORT_UTILITY.import_schema(oraexp.t_param_list('CWI_SPI_DC','CWI_TXN'),'DATAPUMP_DIR','logfile.log','dumpfile.dmp');
EXIT