import pandas as pd
import numpy as np
from pprint import pprint

data=pd.read_csv('data.csv')
data=data[['STATEFP','D2A_Ranked','D2B_Ranked','D3B_Ranked','D4A_Ranked','NatWalkInd','COUNTYFP']]
data=data.dropna()
# for a statefp find the average of the values corresponding to the statefp

data=data.groupby(['COUNTYFP','STATEFP']).mean()


#change the value of statedp to "State_id "+statefp and countyfp to "County_id "+countyfp
data=data.reset_index()
for i in range(len(data)):
    data.loc[i,'STATEFP']="\"State_id"+str(data.loc[i,'STATEFP'] )+"\""
    data.loc[i,'COUNTYFP']="\"County_id"+str(data.loc[i,'COUNTYFP'])+"\""
data=data.set_index(['COUNTYFP','STATEFP'])
#filter out rows with statefp=1 and statefp=2
data=data.reset_index()
# data=data[(data.STATEFP==1) | (data.STATEFP==2)]
data.to_csv('refined1.csv',index=False)