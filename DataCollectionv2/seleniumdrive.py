from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import os
import time as t
import pandas as pd

#--------------------------------------------------------------------------------------------------------------
#List of subjects to select from the dropdown menu. This list is based on the options available in the dropdown menu on the SDO website.
subjects = [
    "Accounting",
    "Apparel Merchandising Design",
    "Art",
    "Biology",
    "Business Administration",
    "Business Administration",
    "Chemistry",
    "Chinese",
    "Civil Engineering",
    "Communications",
    "Communications Specialist",
    "Communicative Sci Disorders",
    "Computer Sciences",
    "Construction Management",
    "Counseling",
    "Criminal Justice",
    "Curriculum and Inst Mth Edu",
    "Curriculum and Instruction",
    "Department Change",
    "Dept of Social Sciences",
    "Early Childhood Education",
    "Early Childhood Elementary Ed",
    "Economics",
    "Education",
    "Education Administration",
    "Educational Leadership",
    "Electrical Engineering",
    "Elementary Education",
    "Engineering General Courses",
    "English",
    "Entrepreneurship",
    "Experiential Learn Opportunity",
    "Family and Consumer Sciences",
    "Finance",
    "Food and Animal Science",
    "Foundation of Education",
    "French",
    "GEN",
    "Geography",
    "Graduate Studies",
    "Health Education",
    "Health Physical Education",
    "History",
    "Human Dev and Family Studies",
    "Liberal Studies",
    "Logistics Supply Chain Mgmt",
    "Management",
    "Management Info Systems",
    "Marketing",
    "Mathematics",
    "Mechanical Engineering",
    "Military Science",
    "Music",
    "Natural Res and Environ Sci",
    "Nutrition and Hospitality Mgmt",
    "Orientation",
    "Philosophy",
    "Physical Education",
    "Physics",
    "Political Science",
    "Psychology",
    "Public Administration",
    "Reading",
    "Science Education",
    "Secondary Education",
    "Social Work",
    "Sociology",
    "Spanish",
    "Special Education",
    "Sport Management",
    "Systems Engineering",
    "Urban Planning",
    "Urban and Regional Planning",
    "Visual Art",
]


#List of semesters to select from the dropdown menu. This list is based on the options available in the dropdown menu on the SDO website.
semesters = [
    "Fall 2026 (View only)",
    "Summer 2026 (View only)",
    "Spring 2026",
    "Fall 2025 (View only)",
    "Summer 2025 (View only)",
    "Spring 2025 (View only)",
    "Fall 2024 (View only)",
    "Summer 2024 (View only)",
    "Spring 2024 (View only)",
    "Fall 2023 (View only)",
    "Summer 2023 (View only)",
    "Spring 2023 (View only)",
    "Fall 2022 (View only)",
    "Summer 2022 (View only)",
    "Spring 2022 (View only)",
    "Fall 2021 (View only)",
    "Summer 2021 (View only)",
    "Spring 2021 (View only)",
    "Fall 2020 (View only)",
    "Summer 2020 (View only)",
    "Spring 2020 (View only)",
    "Fall 2019 (View only)",
    "Summer 2019 (View only)",
    "Spring 2019 (View only)",
    "Fall 2018 (View only)",
    "Summer 2018 (View only)",
    "Spring 2018 (View only)",
    "Fall 2017 (View only)",
    "Summer 2017 (View only)",
    "Spring 2017 (View only)",
    "Fall 2016 (View only)",
    "Summer 2016 (View only)",
    "Spring 2016 (View only)",
    "Fall 2015 (View only)",
    "Summer 2015 (View only)",
    "Spring 2015 (View only)",
    "Fall 2014 (View only)",
    "Summer 2014 (View only)",
    "Spring 2014 (View only)",
    "Fall 2013 (View only)",
    "Summer 2013 (View only)",
    "Spring 2013 (View only)",
    "Fall 2012 (View only)",
    "Summer 2012 (View only)",
    "Spring 2012 (View only)",
    "Fall 2011 (View only)",
    "Summer 2011 (View only)",
    "Spring 2011 (View only)",
    "Fall 2010 (View only)",
    "Summer 2010 (View only)",
    "Spring 2010 (View only)",
    "Fall 2009 (View only)",
]
#-------------------------------------------------------------------------------------------------------------



#Helper functions
def parse_table(table):
    data= []
    isheader = True
    headers = [th.text for th in table.find_elements(By.TAG_NAME, 'th')]
    rows = table.find_elements(By.TAG_NAME, 'tr')
    for row in rows:
        cols = row.find_elements(By.TAG_NAME, 'td')
        if cols:
            data.append([col.text for col in cols])
            if len(cols) != len(headers) and isheader:
                isheader = False
    return isheader ,headers, data
   
   
#-------------------------------------------------------------------------------------------------------------            
access_point = input("Enter the access point for the SDO website: ")
#-------------------------------------------------------------------------------------------------------------
options = Options()
PROFILE_PATH = os.path.join(os.getcwd(), "DataCollection", "profile")
options.add_argument(f"user-data-dir={PROFILE_PATH}")
driver = webdriver.Chrome(options=options)
wait = WebDriverWait(driver, 10)
#-------------------------------------------------------------------------------------------------------------
driver.get(access_point)
t.sleep(20)
driver.find_element(By.XPATH, '/html/body/div[1]/div[2]/span/map/table/tbody/tr[1]/td/table/tbody/tr/td[3]/a').click()
t.sleep(5)
driver.find_element(By.XPATH, '/html/body/div[3]/table[1]/tbody/tr[1]/td[2]/a').click()
t.sleep(1)
driver.find_element(By.XPATH, '/html/body/div[3]/table[1]/tbody/tr[3]/td[2]/a').click()
t.sleep(1)
dropdown = Select(driver.find_element(By.XPATH, '/html/body/div[3]/form/table/tbody/tr/td/select'))
dropdown.select_by_visible_text('Fall 2025')
t.sleep(2)
driver.find_element(By.XPATH, '/html/body/div[3]/form/input[2]').click()
t.sleep(2)
#------------------------------------------------------------------------------------------------------------
#Where the fun begins. Get the list of all the courses in the dropdown menu and select each one.
for i in range(len(subjects)):
    dropdown2 = Select(wait.until(EC.element_to_be_clickable((By.XPATH, '/html/body/div[3]/form/table/tbody/tr/td/select'))))
    dropdown2.select_by_visible_text(subjects[i])
    submit_btn =wait.until(EC.element_to_be_clickable((By.XPATH, '/html/body/div[3]/form/input[17]')))
    submit_btn.click()
    #Get Courses for a selected subject. 
    try:
        table = wait.until(EC.presence_of_element_located((By.XPATH, '/html/body/div[3]/table[2]')))
    except:
        print(f"No courses found for {subjects[i]}")
        driver.back()
        wait.until(EC.presence_of_element_located((By.XPATH, '/html/body/div[3]/form/table/tbody/tr/td/select')))
        continue
    else:
        isheader ,headers, data = parse_table(table)
        if isheader:
            df = pd.DataFrame(data, columns=headers or None)
        else:
            df = pd.DataFrame(data)
        print(df)
        df.to_csv(f"DataCollection/{subjects[i]}.csv", index=False)
        #Go back to the previous page to select the next subject.
        driver.back()
        wait.until(EC.presence_of_element_located((By.XPATH, '/html/body/div[3]/form/table/tbody/tr/td/select')))
driver.quit()
print("Done")
