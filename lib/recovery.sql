WHENEVER SQLERROR EXIT SQL.SQLCODE
EXEC auto_bkp_reco.IMPORT_UTILITY.import_schema(auto_bkp_reco.t_param_list('CWI_SPI_DC','CWI_TXN'),'DATAPUMP_DIR','logfile.log','dumpfile.dmp');
EXIT