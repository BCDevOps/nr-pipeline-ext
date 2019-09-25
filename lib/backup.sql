WHENEVER SQLERROR EXIT SQL.SQLCODE
call auto_bkp_reco.EXPORT_UTILITY.export_schema(oraexp.t_param_list('CWI_SPI_DC','CWI_TXN'),'DATAPUMP_DIR','logfile.log','dumpfile.dmp');
EXIT

-- select sysdate from dual;
-- EXIT